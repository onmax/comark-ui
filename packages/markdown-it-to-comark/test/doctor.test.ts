import { describe, expect, it } from "vite-plus/test";
import { runProjectFixture } from "vite-doctor/testkit";
import markdownItToComark from "../src/doctor.ts";

const code = `import MarkdownIt from "markdown-it";\nconst md = new MarkdownIt();\nexport const render = async (source: string) => md.render(source);\n`;
const doc = "# A\n\nSet {value} first.\n";

const run = (files: Record<string, string>, options: { fix?: boolean; unsafeFix?: boolean } = {}) =>
  runProjectFixture({ framework: "vite", extensions: [markdownItToComark()], files, run: options });

const applied = (text: string, edits: { range: { start: number; end: number }; text: string }[]) =>
  [...edits]
    .sort((a, b) => b.range.start - a.range.start)
    .reduce((out, edit) => out.slice(0, edit.range.start) + edit.text + out.slice(edit.range.end), text);

describe("markdown-it-to-comark/doctor", () => {
  it("offers the content escapes as a safe fix and the setup rewrite as an unsafe one", async () => {
    const { diagnostics } = await run({ "render.ts": code, "docs/a.md": doc });
    const content = diagnostics.find((item) => item.code === "MIC0302");
    expect(content?.fix?.kind).toBe("safe");
    expect(applied(doc, content!.fix!.edits)).toBe("# A\n\nSet \\{value} first.\n");
    const rewrite = diagnostics.find((item) => item.code === "MIC0202");
    expect(rewrite?.fix?.kind).toBe("unsafe");
    const rewritten = applied(code, rewrite!.fix!.edits);
    expect(rewritten).toContain("(await renderHtml(source, md))");
    expect(rewritten).not.toContain('from "markdown-it"');
  });

  it("applies only the content escapes with --fix", async () => {
    const result = await run({ "render.ts": code, "docs/a.md": doc }, { fix: true });
    expect(result.fixes).toMatchObject({ files: 1, edits: 1, skipped: 0 });
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).not.toContain("MIC0302");
    expect(codes).toContain("MIC0202");
  });

  it("rewrites the setup too with --unsafe-fix", async () => {
    const result = await run({ "render.ts": code, "docs/a.md": doc }, { unsafeFix: true });
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).not.toContain("MIC0302");
    expect(codes).not.toContain("MIC0202");
  });

  it("reports setups it can't rewrite as diagnostics", async () => {
    const { diagnostics } = await run({
      "render.ts": `import MarkdownIt from "markdown-it";\nconst md = new MarkdownIt();\nexport const render = (source: string) => md.render(source);\n`,
    });
    expect(diagnostics.map((item) => item.code)).toContain("MIC0201");
  });
});
