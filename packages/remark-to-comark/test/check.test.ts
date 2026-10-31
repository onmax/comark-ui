import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { check } from "../src/check.ts";
import { formatFindings } from "../src/report.ts";

function project(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "remark-to-comark-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const fixture = project({
  "src/render.ts": `import { remark } from "remark";\nimport html from "remark-html";\nimport rehypeAutolinkHeadings from "rehype-autolink-headings";\nimport mine from "./mine.js";\nexport const a = async (md) => String(await remark().use(html).process(md));\nexport const b = async (md) => String(await remark().use(mine).use(html).process(md));\nexport const c = [rehypeAutolinkHeadings];\n`,
  "astro.config.mjs": `import remarkToc from "remark-toc";\nexport default { markdown: { remarkPlugins: [remarkToc] } };\n`,
  "docs/a.md": "# A\n\nSet {value} first.\n",
  "docs/b.md": "# B\n\nPlain.\n",
  "docs/c.mdx": "<Callout />\n",
});

describe("check", () => {
  it("counts a Docusaurus site's .md files as MDX unless its config sets markdown.format to detect", async () => {
    const site = (config: string) =>
      project({
        "website/docusaurus.config.ts": config,
        "website/docs/a.md": "Set {value} first.\n",
        "README.md": "Set {value} first.\n",
      });
    const mdx = await check(site("export default { title: 'x' };\n"));
    expect(mdx.map((finding) => `${finding.code} ${finding.file}`)).toEqual([
      "RTC0302 README.md",
      "RTC0301 website/docs/a.md",
    ]);
    expect(mdx[1]!.params).toMatchObject({ count: 1, docusaurus: 1 });
    const detect = await check(site("export default { markdown: { format: 'detect' } };\n"));
    expect(detect.map((finding) => `${finding.code} ${finding.file}`)).toEqual([
      "RTC0302 README.md",
      "RTC0302 website/docs/a.md",
    ]);
  });

  it("reports every kind of finding with its code", async () => {
    const codes = (await check(fixture)).map(
      (finding) => `${finding.code} ${finding.file}:${finding.line}`,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "RTC0101 astro.config.mjs:2",
        "RTC0102 astro.config.mjs:2",
        "RTC0105 src/render.ts:6",
        "RTC0201 src/render.ts:6",
        "RTC0202 src/render.ts:5",
        "RTC0302 docs/a.md:3",
        "RTC0301 docs/c.mdx:1",
      ]),
    );
    expect(codes.some((code) => code.includes("docs/b.md"))).toBe(false);
  });

  it("says what each finding means, what to do, and where the docs are", async () => {
    const [finding] = JSON.parse(formatFindings(await check(fixture), { json: true })) as {
      code: string;
      why: string;
      fix: string;
      docs: string;
    }[];
    expect(finding).toMatchObject({
      why: expect.any(String),
      fix: expect.any(String),
      docs: expect.stringContaining("/remark-to-comark/diagnostics#rtc"),
    });
  });

  it("points comark-ui counterparts at their docs and the skill", async () => {
    const text = formatFindings(await check(fixture), { verbose: true });
    expect(text).toContain("comark-outline (https://comark-ui.onmax.me/outline/)");
    expect(text).toContain("npx skills add onmax/comark-ui");
  });

  it("ends with what wasn't migrated and what to run next", async () => {
    const text = formatFindings(await check(fixture));
    expect(text).toContain("Not migrated:");
    expect(text).toContain("framework or component setups are reported, not rewritten (RTC0101)");
    expect(text).toContain("MDX is left as it is (RTC0301)");
    expect(text).toContain('remark-to-comark content "**/*.{md,mdx}" --write');
  });

  it("writes paths and commands relative to where the check ran", async () => {
    const findings = await check(fixture, undefined, { display: "site" });
    expect(findings.find((finding) => finding.code === "RTC0302")).toMatchObject({
      file: "site/docs/a.md",
    });
    const text = formatFindings(findings, { root: "site", verbose: true });
    expect(text).toContain('remark-to-comark content "site/docs/a.md" --write');
    expect(text).toContain('remark-to-comark rewrite "site" --write');
  });

  it("reads Docusaurus's markdown.format from the config's AST, the nearest site, and frontmatter", async () => {
    const codes = async (files: Record<string, string>) =>
      (await check(project(files))).map((finding) => `${finding.code} ${finding.file}`).sort();
    const doc = "Set {value} first.\n";
    expect(
      await codes({
        "docusaurus.config.js":
          "// markdown: { format: 'detect' }\nexport default { customFields: { format: 'md' } };\n",
        "docs/a.md": doc,
      }),
    ).toEqual(["RTC0301 docs/a.md"]);
    expect(
      await codes({
        "docusaurus.config.js": 'export default { "markdown": { "format": `detect` } };\n',
        "docs/a.md": doc,
      }),
    ).toEqual(["RTC0302 docs/a.md"]);
    expect(
      await codes({
        "docusaurus.config.js": "export default {};\n",
        "nested/docusaurus.config.js": "export default { markdown: { format: 'detect' } };\n",
        "nested/docs/a.md": doc,
        "docs/b.md": doc,
      }),
    ).toEqual(["RTC0301 docs/b.md", "RTC0302 nested/docs/a.md"]);
    expect(
      await codes({
        "docusaurus.config.js": "export default { markdown: { format: 'detect' } };\n",
        "docs/a.md": `---\nmdx:\n  format: mdx\n---\n${doc}`,
        "docs/b.mdx": `---\nmdx: { format: md }\n---\n${doc}`,
      }),
    ).toEqual(["RTC0301 docs/a.md", "RTC0302 docs/b.mdx"]);
    expect(
      await codes({
        "docusaurus.config.js":
          "const format = pick();\nexport default { markdown: { format } };\n",
        "docs/a.md": doc,
      }),
    ).toEqual(["RTC0301 docs/a.md"]);
  });

  it("reads react-markdown's plugin props, and not schemas or destructuring defaults", async () => {
    const findings = await check(
      project({
        "chat.tsx": `import ReactMarkdown from "react-markdown";\nimport remarkGfm from "remark-gfm";\nexport const C = ({ text }) => <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;\n`,
        "schema.ts": `import { z } from "zod";\nexport const s = z.object({ remarkPlugins: z.array(z.any()).default([]) });\nexport function f({ remarkPlugins = [], rehypePlugins: list }) { return [remarkPlugins, list]; }\n`,
      }),
    );
    expect(findings.map((finding) => `${finding.code} ${finding.file}:${finding.line}`)).toEqual(
      expect.arrayContaining(["RTC0101 chat.tsx:3"]),
    );
    expect(findings.find((finding) => finding.code === "RTC0101")?.params).toMatchObject({
      host: "react-markdown",
    });
    expect(findings.some((finding) => finding.file === "schema.ts")).toBe(false);
  });

  it("parses with the project's math plugin, or the bundled one, so content doesn't escape inside math", async () => {
    const findings = await check(
      project({
        "render.ts": `import { remark } from "remark";\nimport remarkMath from "remark-math";\nexport const f = (md) => remark().use(remarkMath).process(md);\n`,
        "doc.md": "Sum $x_{i}$ and {y}.\n",
      }),
    );
    expect(findings.find((finding) => finding.code === "RTC0302")?.params).toMatchObject({
      count: 1,
    });
  });
});
