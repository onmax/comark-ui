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
      held: [],
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
          edit: { start: 6, end: 7, text, source: "Hello {name}\n" },
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

  it("keeps the renderer unchanged when required content becomes stale", async () => {
    const root = remarkProject();
    const renderer = readFileSync(join(root, "src/render.ts"), "utf8");
    const result = await plan(root);
    writeFileSync(join(root, "docs/a.md"), "# Edited\n");
    // Setup may sort before content; applying it still has to wait for the content edits.
    expect(apply(root, [...result.changes].reverse())).toEqual({
      written: [],
      stale: ["docs/a.md"],
      held: [{ file: "src/render.ts", migrator: "remark-to-comark", waiting: ["docs/a.md"] }],
    });
    expect(readFileSync(join(root, "src/render.ts"), "utf8")).toBe(renderer);
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).toBe("# Edited\n");
  });

  it.each([
    ["remark", "RTC"],
    ["markdown-it", "MIC"],
    ["marked", "MKC"],
  ])(
    "requires every %s content edit without blocking another migrator",
    async (library, prefix) => {
      const other = library === "remark" ? "marked" : "remark";
      const root = project({
        "package.json": manifest({ [library]: "*", [other]: "*" }),
        "a-render.ts": "old",
        "b.md": "{x}",
        "c.md": "{x}",
        "z-render.ts": "old",
      });
      const result = await plan(root, {
        load: async (name) => ({
          check: async () =>
            name === `${library}-to-comark`
              ? [
                  {
                    code: `${prefix}0202`,
                    params: { at: "a-render.ts:1" },
                    file: "a-render.ts",
                    line: 1,
                    edit: { start: 0, end: 3, text: "new", source: "old" },
                  },
                  ...["b.md", "c.md"].map((file) => ({
                    code: `${prefix}0302`,
                    params: { at: `${file}:1` },
                    file,
                    line: 1,
                    edit: { start: 0, end: 1, text: "\\{", source: "{x}" },
                  })),
                ]
              : [
                  {
                    code: `${other === "remark" ? "RTC" : "MKC"}0202`,
                    params: { at: "z-render.ts:1" },
                    file: "z-render.ts",
                    line: 1,
                    edit: { start: 0, end: 3, text: "new", source: "old" },
                  },
                ],
          catalog: {},
          toDiagnostic: () => ({ why: "", fix: "" }),
        }),
      });
      writeFileSync(join(root, "b.md"), "Edited");
      expect(apply(root, result.changes)).toEqual({
        written: ["c.md", "z-render.ts"],
        stale: ["b.md"],
        held: [{ file: "a-render.ts", migrator: `${library}-to-comark`, waiting: ["b.md"] }],
      });
      expect(readFileSync(join(root, "a-render.ts"), "utf8")).toBe("old");
      expect(readFileSync(join(root, "c.md"), "utf8")).toBe("\\{x}");
      expect(readFileSync(join(root, "z-render.ts"), "utf8")).toBe("new");
    },
  );

  it("skips a file edited while its migrator is still checking", async () => {
    const root = project({
      "package.json": manifest({ remark: "^15.0.0" }),
      "README.md": "Hello {name}\n",
    });
    const result = await plan(root, {
      load: async () => ({
        check: async () => {
          const source = readFileSync(join(root, "README.md"), "utf8");
          writeFileSync(join(root, "README.md"), `Prepended\n${source}`);
          return [
            {
              code: "RTC0302",
              params: { at: "README.md:1" },
              file: "README.md",
              line: 1,
              edit: { start: 6, end: 7, text: "\\{", source },
            },
          ];
        },
        catalog: {},
        toDiagnostic: () => ({ why: "", fix: "" }),
      }),
    });
    expect(apply(root, result.changes)).toEqual({
      written: [],
      stale: ["README.md"],
      held: [],
    });
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe("Prepended\nHello {name}\n");
  });

  it.each([
    ["remark", "RTC"],
    ["markdown-it", "MIC"],
    ["marked", "MKC"],
  ])("keeps %s setup unchanged while content cannot be migrated", async (library, prefix) => {
    const root = project({
      "package.json": manifest({ [library]: "*" }),
      "render.ts": "old",
      "a.md": "{x}",
    });
    const result = await plan(root, {
      load: async () => ({
        check: async () => [
          {
            code: `${prefix}0202`,
            params: { at: "render.ts:1" },
            file: "render.ts",
            line: 1,
            edit: { start: 0, end: 3, text: "new", source: "old" },
          },
          { code: `${prefix}0303`, params: { at: "b.md:1" }, file: "b.md", line: 1 },
          {
            code: `${prefix}0302`,
            params: { at: "a.md:1" },
            file: "a.md",
            line: 1,
            edit: { start: 0, end: 1, text: "\\{", source: "{x}" },
          },
        ],
        catalog: {},
        toDiagnostic: () => ({ why: "", fix: "" }),
      }),
    });
    expect(result.held).toEqual([
      { file: "render.ts", migrator: `${library}-to-comark`, waiting: ["b.md"] },
    ]);
    expect(apply(root, result.changes)).toEqual({ written: ["a.md"], stale: [], held: [] });
    expect(readFileSync(join(root, "render.ts"), "utf8")).toBe("old");
  });

  it("keeps a setup unchanged while another migrator also wants its content", async () => {
    const root = project({
      "package.json": manifest({ remark: "*", marked: "*" }),
      "render.ts": "old",
      "README.md": "{x}",
    });
    const result = await plan(root, {
      load: async (name) => ({
        check: async () => [
          ...(name === "remark-to-comark"
            ? [
                {
                  code: "RTC0202",
                  params: { at: "render.ts:1" },
                  file: "render.ts",
                  line: 1,
                  edit: { start: 0, end: 3, text: "new", source: "old" },
                },
              ]
            : []),
          {
            code: name === "remark-to-comark" ? "RTC0302" : "MKC0302",
            params: { at: "README.md:1" },
            file: "README.md",
            line: 1,
            edit: {
              start: 0,
              end: 1,
              text: name === "remark-to-comark" ? "\\{" : "&#123;",
              source: "{x}",
            },
          },
        ],
        catalog: {},
        toDiagnostic: () => ({ why: "", fix: "" }),
      }),
    });
    expect(result.changes).toEqual([]);
    expect(result.held).toEqual([
      { file: "render.ts", migrator: "remark-to-comark", waiting: ["README.md"] },
    ]);
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

  it("says which setup it leaves while Markdown still needs a hand fix", () => {
    const root = project({
      "package.json": manifest({
        remark: "^15.0.0",
        "remark-gfm": "^4.0.0",
        "remark-html": "^16.0.0",
      }),
      "src/render.ts": `import { remark } from "remark";\nimport gfm from "remark-gfm";\nimport html from "remark-html";\nexport const render = async (md: string) => String(await remark().use(gfm).use(html).process(md));\n`,
      "docs/a.md": "~a~~b~~a~\n",
    });
    const output = run(root, "--yes");
    expect(output.stdout).toContain(
      `src/render.ts still renders with remark: switching it now would change how docs/a.md renders. Migrate it first (\`npx remark-to-comark check "${root}" --verbose\` says how), then run the wizard again.`,
    );
    expect(readFileSync(join(root, "src/render.ts"), "utf8")).not.toContain("renderHtml(");
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

  it("moves only the libraries --only names", () => {
    const root = project({
      "package.json": manifest({ remark: "^15.0.0", "markdown-it": "^14.0.0" }),
      "docs/a.md": "Set [value] first.\n",
    });
    const report = JSON.parse(run(root, "--json", "--only", "markdown-it").stdout);
    expect(report.reports.map((entry: { library: string }) => entry.library)).toEqual([
      "markdown-it",
    ]);
    expect(report.changes).toEqual([{ file: "docs/a.md", migrator: "markdown-it-to-comark" }]);
    expect(run(root, "--only", "showdown").stderr).toContain(
      "Cannot move `showdown`: --only takes remark, markdown-it, marked.",
    );
  });

  it("refuses a path that isn't a directory", () => {
    const output = run("/no/such/dir");
    expect(output.status).toBe(1);
    expect(output.stderr).toContain("Cannot migrate `/no/such/dir`: no such directory.");
  });
});
