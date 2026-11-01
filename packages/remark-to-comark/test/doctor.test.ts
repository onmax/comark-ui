import { describe, expect, it } from "vite-plus/test";
import { runProjectFixture } from "vite-doctor/testkit";
import remarkToComark from "../src/doctor.ts";

const chain = `import { remark } from "remark";\nimport html from "remark-html";\nexport const render = async (md: string) => String(await remark().use(html).process(md));\n`;
const doc = "# A\n\nSet {value} first.\n";

const run = (files: Record<string, string>, options: { fix?: boolean; unsafeFix?: boolean } = {}) =>
  runProjectFixture({ framework: "vite", extensions: [remarkToComark()], files, run: options });

const applied = (text: string, edits: { range: { start: number; end: number }; text: string }[]) =>
  [...edits]
    .sort((a, b) => b.range.start - a.range.start)
    .reduce(
      (out, edit) => out.slice(0, edit.range.start) + edit.text + out.slice(edit.range.end),
      text,
    );

describe("remark-to-comark/doctor fixes", () => {
  it("offers the content escapes as a safe fix and the chain rewrite as an unsafe one", async () => {
    const { diagnostics } = await run({ "render.ts": chain, "docs/a.md": doc });
    const content = diagnostics.find((item) => item.code === "RTC0302");
    expect(content?.fix?.kind).toBe("safe");
    expect(applied(doc, content!.fix!.edits)).toBe("# A\n\nSet \\{value} first.\n");
    const rewrite = diagnostics.find((item) => item.code === "RTC0202");
    expect(rewrite?.fix?.kind).toBe("unsafe");
    const code = applied(chain, rewrite!.fix!.edits);
    expect(code).toContain("String(await renderHtml(md, comarkOptions(");
    expect(code).not.toContain("remark-html");
  });

  it("applies only the content escapes with --fix", async () => {
    const result = await run({ "render.ts": chain, "docs/a.md": doc }, { fix: true });
    expect(result.fixes).toMatchObject({ files: 1, edits: 1, skipped: 0 });
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).not.toContain("RTC0302");
    expect(codes).toContain("RTC0202");
  });

  it("rewrites the chain too with --unsafe-fix", async () => {
    const result = await run({ "render.ts": chain, "docs/a.md": doc }, { unsafeFix: true });
    expect(result.fixes).toMatchObject({ files: 2, edits: 2, skipped: 0 });
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).not.toContain("RTC0302");
    expect(codes).not.toContain("RTC0202");
  });

  it("leaves chains it can't rewrite, skipped blocks, MDX, and ambiguous setups as diagnostics", async () => {
    const files = {
      "render.mjs": `import { remark } from "remark";\nimport html from "remark-html";\nimport mine from "./mine.js";\nexport const render = async (md) => String(await remark().use(mine).use(html).process(md));\n`,
      "notes/package.json": "{}",
      "notes/a.md": "~a~~b~~a~\n",
      "docs/c.mdx": "<Callout />\n",
      "site/package.json": "{}",
      "site/view.tsx": `import Markdown from "react-markdown"; import gfm from "remark-gfm"; export const C = () => <><Markdown remarkPlugins={[]} /><Other remarkPlugins={[gfm]} /></>;`,
      "site/page.md": "~a~ {x}\n",
    };
    const result = await run(files, { unsafeFix: true });
    expect(result.fixes ?? { edits: 0 }).toMatchObject({ edits: 0 });
    const found = result.diagnostics
      .filter((item) => item.code.startsWith("RTC0"))
      .map(
        (item) =>
          `${item.code} ${item.file.split("/").slice(-2).join("/")} ${item.fix ? "fix" : "-"}`,
      );
    expect(found).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^RTC0201 .*render\.mjs -$/),
        "RTC0303 notes/a.md -",
        "RTC0301 docs/c.mdx -",
        "RTC0303 site/page.md -",
      ]),
    );
    expect(found.filter((line) => line.endsWith(" fix"))).toEqual([]);
  });
});
