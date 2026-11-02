import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { check } from "../src/check.ts";
import { formatFindings } from "../src/report.ts";

function project(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "markdown-it-to-comark-"));
  // A synthetic root for CLI discovery, so a checkout above the temporary directory doesn't become the fixture root.
  writeFileSync(join(root, ".git"), "fixture");
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const RENDER = `import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import mine from "./mine.js";
const md = new MarkdownIt({ html: true, highlight }).use(footnote);
export const a = async (source: string) => md.render(source);
const other = new MarkdownIt();
export const b = (source: string) => other.use(mine).render(source);
const plain = new MarkdownIt({ linkify: true });
export const c = async (source: string) => plain.render(source);
`;

const fixture = () =>
  project({
    "package.json": "{}",
    "src/render.ts": RENDER,
    "docs/.vitepress/config.ts":
      'import mark from "markdown-it-mark";\nexport default { markdown: { config: (md) => md.use(mark) } };\n',
    "docs/a.md": "# A\n\nSet [value] first.\n\n::: tip\nKept for VitePress.\n:::\n",
    "docs/b.md": "# B\n\nPlain.\n",
  });

const cli = (root: string, ...args: string[]) =>
  spawnSync(process.execPath, [fileURLToPath(new URL("../src/cli.ts", import.meta.url)), ...args], {
    cwd: root,
    encoding: "utf8",
  });

describe("check", () => {
  it("reports every kind of finding with its code", async () => {
    const codes = (await check(fixture())).map(
      (finding) => `${finding.code} ${finding.file}:${finding.line}`,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "MIC0101 docs/.vitepress/config.ts:2",
        "MIC0102 docs/.vitepress/config.ts:2",
        "MIC0102 src/render.ts:4",
        "MIC0103 src/render.ts:4",
        "MIC0107 src/render.ts:4",
        "MIC0105 src/render.ts:7",
        "MIC0201 src/render.ts:4",
        "MIC0201 src/render.ts:6",
        "MIC0202 src/render.ts:8",
        "MIC0302 docs/a.md:3",
      ]),
    );
    expect(codes.some((code) => code.includes("docs/b.md"))).toBe(false);
  });

  it("tries both values of an option it can't read before escaping", async () => {
    const root = project({
      "render.ts":
        'import MarkdownIt from "markdown-it";\nconst rawHtml = true;\nexport const md = new MarkdownIt({ html: rawHtml });\n',
      "a.md": "<div>{x}</div>\n\nText {y}\n",
    });
    const content = (await check(root)).filter((finding) => finding.code === "MIC0302");
    expect(content).toHaveLength(1);
    expect(content[0]!.edit?.text).toBe("\\");
    expect(content[0]!.line).toBe(3);
  });

  it("prints the same JSON shape as remark-to-comark", async () => {
    const [finding] = JSON.parse(formatFindings(await check(fixture()), { json: true })) as Record<
      string,
      unknown
    >[];
    expect(Object.keys(finding!).sort()).toEqual([
      "code",
      "docs",
      "file",
      "fix",
      "line",
      "rule",
      "severity",
      "why",
    ]);
    expect(finding!.docs).toEqual(
      expect.stringContaining("/markdown-it-to-comark/diagnostics#mic"),
    );
  });

  it("ends with what wasn't migrated and what to run next", async () => {
    const text = formatFindings(await check(fixture()));
    expect(text).toContain("Not migrated:");
    expect(text).toContain("(MIC0101)");
    expect(text).toContain('markdown-it-to-comark content "**/*.md" --write');
    expect(text).toContain('markdown-it-to-comark rewrite "." --write');
  });
});

describe("the CLI", () => {
  it("rewrites what it can and says why the rest stays", () => {
    const root = fixture();
    const dry = cli(root, "rewrite", ".");
    expect(dry.status).toBe(0);
    expect(dry.stdout).toContain("src/render.ts:8 can be rewritten");
    expect(dry.stdout).toContain("src/render.ts:4 left: it sets `highlight`");
    expect(readFileSync(join(root, "src/render.ts"), "utf8")).toBe(RENDER);
    expect(cli(root, "rewrite", ".", "--write").status).toBe(0);
    expect(readFileSync(join(root, "src/render.ts"), "utf8")).toContain(
      "(await renderHtml(source, plain))",
    );
  });

  it("escapes content with the site's syntax in mind, and only with --write", () => {
    const root = fixture();
    expect(cli(root, "content", "docs/**/*.md").stdout).toContain(
      "1 of 2 Markdown files would change",
    );
    expect(cli(root, "content", "docs/**/*.md", "--write").status).toBe(0);
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).toBe(
      "# A\n\nSet \\[value\\] first.\n\n::: tip\nKept for VitePress.\n:::\n",
    );
  });

  it("lists setups and what each plugin becomes", () => {
    const output = cli(fixture(), "scan", ".").stdout;
    expect(output).toContain("src/render.ts:4 (markdown-it) { html: true, highlight: highlight }");
    expect(output).toMatch(/markdown-it-footnote\s+bridge/);
    expect(output).toMatch(/markdown-it-mark\s+bridge/);
  });

  it("exits 1 on an unknown command or directory", () => {
    expect(cli(fixture(), "nope").status).toBe(1);
    expect(cli(fixture(), "check", "missing").status).toBe(1);
  });
});
