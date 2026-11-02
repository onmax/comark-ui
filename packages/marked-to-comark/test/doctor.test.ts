import { describe, expect, it } from "vite-plus/test";
import { runProjectFixture } from "vite-doctor/testkit";
import markedToComark from "../src/doctor.ts";

const code = `import { marked } from "marked";\nimport { readFileSync } from "node:fs";\nexport async function post(slug: string) {\n  return marked.parse(readFileSync(\`posts/\${slug}.md\`, "utf8"));\n}\n`;
const doc = "# A\n\nSet {value} first.\n";

const run = (files: Record<string, string>, options: { fix?: boolean; unsafeFix?: boolean } = {}) =>
  runProjectFixture({ framework: "vite", extensions: [markedToComark()], files, run: options });

const applied = (text: string, edits: { range: { start: number; end: number }; text: string }[]) =>
  [...edits]
    .sort((a, b) => b.range.start - a.range.start)
    .reduce(
      (out, edit) => out.slice(0, edit.range.start) + edit.text + out.slice(edit.range.end),
      text,
    );

describe("marked-to-comark/doctor fixes", () => {
  it("offers the content escapes as a safe fix and the call rewrite as an unsafe one", async () => {
    const { diagnostics } = await run({ "render.ts": code, "posts/a.md": doc });
    const content = diagnostics.find((item) => item.code === "MKC0302");
    expect(content?.fix?.kind).toBe("safe");
    expect(applied(doc, content!.fix!.edits)).toBe("# A\n\nSet \\{value} first.\n");
    const rewrite = diagnostics.find((item) => item.code === "MKC0202");
    expect(rewrite?.fix?.kind).toBe("unsafe");
    const rewritten = applied(code, rewrite!.fix!.edits);
    expect(rewritten).toContain("return await renderHtml(readFileSync(");
    expect(rewritten).not.toContain(`from "marked"`);
  });

  it("applies only the content escapes with --fix", async () => {
    const result = await run({ "render.ts": code, "posts/a.md": doc }, { fix: true });
    expect(result.fixes).toMatchObject({ files: 1, edits: 1, skipped: 0 });
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).not.toContain("MKC0302");
    expect(codes).toContain("MKC0202");
  });

  it("rewrites the call too with --unsafe-fix", async () => {
    const result = await run({ "render.ts": code, "posts/a.md": doc }, { unsafeFix: true });
    expect(result.fixes).toMatchObject({ files: 2, edits: 2, skipped: 0 });
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).not.toContain("MKC0302");
    expect(codes).not.toContain("MKC0202");
  });
});
