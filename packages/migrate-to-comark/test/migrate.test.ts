import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { apply, detect, plan, type Load, type Migrator } from "../src/index.ts";

function project(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "migrate-to-comark-"));
  writeFileSync(join(root, ".git"), "fixture");
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const manifest = (dependencies: Record<string, string>) => JSON.stringify({ dependencies });
const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const run = (root: string, ...args: string[]) =>
  spawnSync(process.execPath, [cli, root, ...args], { encoding: "utf8" });

const remarkProject = () =>
  project({
    "package.json": manifest({ remark: "^15.0.0", "remark-html": "^16.0.0" }),
    "src/render.ts": `import { remark } from "remark";\nimport html from "remark-html";\nexport const render = async (md: string) => String(await remark().use(html).process(md));\n`,
    "docs/a.md": "# A\n\nSet {value} first.\n",
    "docs/b.md": "# B\n\nPlain.\n",
  });

describe("detect", () => {
  it("finds each library in every package.json, and the ones with no migrator", async () => {
    const root = project({
      "package.json": manifest({ marked: "^15.0.0", showdown: "^2.0.0" }),
      "apps/docs/package.json": JSON.stringify({ devDependencies: { vitepress: "^1.0.0" } }),
      "apps/web/package.json": manifest({ "react-markdown": "^10.0.0", comark: "^0.8.0" }),
      "node_modules/remark/package.json": manifest({ unified: "^11.0.0" }),
    });
    const detected = await detect(root);
    expect(
      detected.libraries.map(({ library, migrator, uses }) => ({ library, migrator, uses })),
    ).toEqual([
      {
        library: "remark",
        migrator: "remark-to-comark",
        uses: [
          { manifest: "apps/web/package.json", dependency: "react-markdown", version: "^10.0.0" },
        ],
      },
      {
        library: "markdown-it",
        migrator: "markdown-it-to-comark",
        uses: [{ manifest: "apps/docs/package.json", dependency: "vitepress", version: "^1.0.0" }],
      },
      {
        library: "marked",
        migrator: "marked-to-comark",
        uses: [{ manifest: "package.json", dependency: "marked", version: "^15.0.0" }],
      },
    ]);
    expect(detected.unsupported).toEqual([
      {
        name: "showdown",
        uses: [{ manifest: "package.json", dependency: "showdown", version: "^2.0.0" }],
      },
    ]);
    expect(detected.comark).toBe(true);
  });
});

describe("plan and apply", () => {
  it("writes exactly what remark-to-comark's content and rewrite write", async () => {
    const root = remarkProject();
    const result = await plan(root);
    expect(result.reports).toHaveLength(1);
    expect(result.changes.map((change) => change.file)).toEqual(["docs/a.md", "src/render.ts"]);
    expect(apply(root, result.changes)).toEqual({
      written: ["docs/a.md", "src/render.ts"],
      stale: [],
    });
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).toBe("# A\n\nSet \\{value} first.\n");
    expect(readFileSync(join(root, "docs/b.md"), "utf8")).toBe("# B\n\nPlain.\n");
    expect(readFileSync(join(root, "src/render.ts"), "utf8")).toContain("renderHtml(");
    expect((await plan(root)).changes).toEqual([]);
  });

  it("gives a file both migrators want to the library its nearest package.json declares", async () => {
    const root = project({
      "package.json": manifest({}),
      "apps/web/package.json": manifest({ remark: "^15.0.0" }),
      "apps/web/posts/a.md": "Set [value] first.\n",
      "docs/package.json": manifest({ "markdown-it": "^14.0.0" }),
      "docs/guide/a.md": "Set [value] first.\n",
      "README.md": "Set [value] first.\n",
    });
    const result = await plan(root);
    expect(result.changes.map(({ file, migrator }) => ({ file, migrator }))).toEqual([
      { file: "apps/web/posts/a.md", migrator: "remark-to-comark" },
      { file: "docs/guide/a.md", migrator: "markdown-it-to-comark" },
    ]);
    expect(result.conflicts).toEqual([
      { file: "README.md", migrators: ["remark-to-comark", "markdown-it-to-comark"] },
    ]);
  });

  it("leaves a file two migrators would change, and says which", async () => {
    const root = project({
      "package.json": manifest({ remark: "^15.0.0", marked: "^15.0.0" }),
      "README.md": "Hello {name}\n",
    });
    const fake = (text: string): Migrator => ({
      check: async () => [
        {
          code: "X0001",
          params: { at: "README.md:1" },
          file: "README.md",
          line: 1,
          edit: { start: 6, end: 7, text },
        },
      ],
      catalog: { X0001: { severity: "warn", ruleId: "x/escape" } },
      toDiagnostic: () => ({ why: "", fix: "" }),
    });
    const load: Load = async (name) => fake(name === "marked-to-comark" ? "&#123;" : "\\{");
    const result = await plan(root, { load });
    expect(result.changes).toEqual([]);
    expect(result.conflicts).toEqual([
      { file: "README.md", migrators: ["remark-to-comark", "marked-to-comark"] },
    ]);
  });

  it("skips a file that changed after the check read it", async () => {
    const root = remarkProject();
    const result = await plan(root);
    writeFileSync(join(root, "docs/a.md"), "# Edited\n");
    expect(apply(root, result.changes).stale).toEqual(["docs/a.md"]);
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).toBe("# Edited\n");
  });

  it("reports a migrator that can't be loaded instead of throwing", async () => {
    const root = project({ "package.json": manifest({ marked: "^15.0.0" }) });
    const result = await plan(root, {
      load: async () => {
        throw new Error("Cannot find package 'marked-to-comark'");
      },
    });
    expect(result.reports[0]!.error).toBe("Cannot find package 'marked-to-comark'");
  });
});

describe("cli", () => {
  it("writes nothing without --yes when it can't ask", () => {
    const root = remarkProject();
    const output = run(root);
    expect(output.status).toBe(0);
    expect(output.stdout).toContain("1 Markdown file and 1 code file to change");
    expect(output.stdout).toContain("Run again with --yes to write 2 files.");
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).toBe("# A\n\nSet {value} first.\n");
  });

  it("writes every change with --yes", () => {
    const root = remarkProject();
    expect(run(root, "--yes").stdout).toContain("Wrote 2 files.");
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).toBe("# A\n\nSet \\{value} first.\n");
  });

  it("prints the plan as JSON for agents", () => {
    const root = remarkProject();
    const report = JSON.parse(run(root, "--json").stdout);
    expect(report.libraries.map((library: { library: string }) => library.library)).toEqual([
      "remark",
    ]);
    expect(report.changes).toEqual([
      { file: "docs/a.md", migrator: "remark-to-comark" },
      { file: "src/render.ts", migrator: "remark-to-comark" },
    ]);
    expect(report.written).toBeUndefined();
  });

  it("says when no package.json declares a library it moves", () => {
    const root = project({ "package.json": manifest({ showdown: "^2.0.0" }) });
    const output = run(root);
    expect(output.stdout).toContain("showdown (package.json) has no migrator yet");
    expect(output.stdout).toContain("declares remark, markdown-it, or marked");
  });

  it("refuses a path that isn't a directory", () => {
    const output = run("/no/such/dir");
    expect(output.status).toBe(1);
    expect(output.stderr).toContain("Cannot migrate `/no/such/dir`: no such directory.");
  });
});
