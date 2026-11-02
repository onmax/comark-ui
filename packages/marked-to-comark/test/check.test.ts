import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { check, formatFindings } from "./support/index.ts";

function project(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "marked-to-comark-"));
  // A synthetic root for CLI discovery, so a checkout above the temporary directory doesn't become the fixture root.
  writeFileSync(join(root, ".git"), "fixture");
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const cli = (root: string, ...args: string[]) =>
  spawnSync(process.execPath, [fileURLToPath(new URL("../src/cli.ts", import.meta.url)), ...args], {
    cwd: root,
    encoding: "utf8",
  });

const blog = {
  "package.json": `{ "dependencies": { "marked": "^12.0.0" } }`,
  "src/posts.ts": `import { marked } from "marked";\nimport { readFileSync } from "node:fs";\nimport mine from "./mine.ts";\nmarked.use(mine);\nexport async function post(slug: string) {\n  return marked.parse(readFileSync(\`posts/\${slug}.md\`, "utf8"));\n}\n`,
  "src/chat.ts": `import { Marked } from "marked";\nconst md = new Marked({ breaks: true });\nexport async function reply(text: string) {\n  return md.parse(text);\n}\nexport function preview(text: string) {\n  return md.parse(text);\n}\n`,
  "posts/hello.md": "# Hello {world}\n\nSee [ref].\n\n[ref]: https://a.dev\n",
  "README.md": "# Readme {x}\n",
};

describe("check", () => {
  it("reports setups, calls, and the Markdown marked reads", async () => {
    const root = project(blog);
    const findings = await check(root);
    const codes = findings.map((finding) => `${finding.code} ${finding.file}:${finding.line}`);
    expect(codes).toEqual(
      expect.arrayContaining([
        "MKC0105 src/posts.ts:4",
        "MKC0201 src/posts.ts:6",
        "MKC0103 src/chat.ts:2",
        "MKC0202 src/chat.ts:4",
        "MKC0201 src/chat.ts:7",
        "MKC0302 posts/hello.md:1",
        "MKC0304 README.md:1",
      ]),
    );
    const content = findings.find((finding) => finding.code === "MKC0302")!;
    const source = readFileSync(join(root, "posts/hello.md"), "utf8");
    expect(
      source.slice(0, content.edit!.start) + content.edit!.text + source.slice(content.edit!.end),
    ).toBe("# Hello \\{world}\n\nSee [ref][].\n\n[ref]: https://a.dev\n");
  });

  it("prints warnings, what's left, and the next commands", async () => {
    const root = project(blog);
    const text = formatFindings(await check(root), { root: "." });
    expect(text).toContain("[MKC0201]");
    expect(text).toContain("Not migrated:");
    expect(text).toContain('marked-to-comark rewrite "." --write');
    expect(text).not.toContain("[MKC0103]");
    const json = JSON.parse(formatFindings(await check(root), { json: true })) as {
      code: string;
      docs: string;
    }[];
    expect(json[0]).toMatchObject({
      code: expect.stringMatching(/^MKC0/),
      docs: expect.stringContaining("/marked-to-comark/diagnostics#mkc0"),
    });
  });

  it("refuses content --write when the project's own tokenizer changes what's text", async () => {
    const root = project({
      "src/a.ts": `import { marked } from "marked";\nmarked.use({ extensions: [mine] });\nexport const a = (s: string) => marked.parse(s);\n`,
      "doc.md": "{x}\n",
    });
    const result = cli(root, "content", "doc.md", "--write");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("MKC0303");
    expect(readFileSync(join(root, "doc.md"), "utf8")).toBe("{x}\n");
  });

  it("rewrites a call on the shared marked that other files only call", async () => {
    const root = project({
      "a.ts": `import { marked } from "marked";\nexport async function a(s: string) { return marked.parse(s); }\n`,
      "b.ts": `import { marked } from "marked";\nexport async function b(s: string) { return marked(s, { breaks: true }); }\n`,
      "c.ts": `import { marked } from "marked";\nmarked.setOptions({ gfm: false });\nexport function c(s: string) { return marked(s); }\n`,
    });
    const codes = (await check(root))
      .filter((finding) => finding.code.startsWith("MKC02"))
      .map((finding) => `${finding.code} ${finding.file}`);
    expect(codes).toEqual(["MKC0201 a.ts", "MKC0201 b.ts", "MKC0201 c.ts"]);
    const alone = project({ "a.ts": codesFile("a"), "b.ts": codesFile("b") });
    expect(
      (await check(alone))
        .filter((finding) => finding.code === "MKC0202")
        .map((finding) => finding.file),
    ).toEqual(["a.ts", "b.ts"]);
  });
});

const codesFile = (name: string) =>
  `import { marked } from "marked";\nexport async function ${name}(s: string) { return marked(s, { breaks: true }); }\n`;

describe("CLI", () => {
  it("rewrites calls and content with --write, and a second check finds less", async () => {
    const root = project(blog);
    expect(cli(root, "rewrite", ".", "--write").stdout).toContain(
      "1 marked call rewritten, 2 left",
    );
    expect(readFileSync(join(root, "src/chat.ts"), "utf8")).toContain(
      'return await renderHtml(text, comarkOptions({ breaks: true, expandTabs: "leading" }));',
    );
    expect(cli(root, "content", "posts/*.md", "--write").stdout).toContain(
      "1 of 1 Markdown files changed",
    );
    const codes = (await check(root)).map((finding) => finding.code);
    expect(codes).not.toContain("MKC0302");
    expect(codes).not.toContain("MKC0202");
  });

  it("scans and prints what each option becomes", () => {
    const root = project(blog);
    const out = cli(root, "scan", ".").stdout;
    expect(out).toContain("src/chat.ts:2 (new Marked() as md, 2 calls)");
    expect(out).toMatch(/breaks: true\s+setup\s+breaks: true\./);
  });

  it("prints usage for an unknown command", () => {
    const result = cli(project({}), "nope");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage:");
  });
});
