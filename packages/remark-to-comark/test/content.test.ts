import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import { compare, comarkHtml, comarkSetup, migrateContent, remarkHtml } from "./support/index.ts";

async function migrated(markdown: string, syntax: "comark" | "plain" = "comark") {
  const result = migrateContent(markdown, { syntax });
  return {
    ...result,
    comparison: compare(
      await remarkHtml(markdown),
      await comarkHtml(result.markdown, comarkSetup({ syntax })),
    ),
  };
}

const cases: [string, string][] = [
  ["braces Comark reads as attributes", "Set it to {value}, or **bold**{.x}.\n"],
  ["brackets Comark reads as spans", "Arrays like [1, 2] and [foo] = bar.\n"],
  ["colons Comark reads as components", ":smile: and ::note at 10:30\n"],
  [
    "shortcut references",
    "See [docs] and ![logo].\n\n[docs]: https://example.com\n[logo]: logo.png\n",
  ],
  ["single-tilde strikethrough", "H~2~O and ~~gone~~\n"],
  [
    "an unclosed bracket, which Comark would read as a span to the end",
    "Pick one [a or b, then {go} on.\n",
  ],
  [
    "a URL remark leaves as text inside raw HTML after an unclosed bracket",
    "x={[\n{ a <code>http://localhost:3001</code> }\n]}\n",
  ],
  ["a block component with a space before its name", "::: info\nbody\n:::\n"],
  ["a colon before `$`, which Comark reads as a component", "Costs :$ 5\n"],
  [
    "a URL after an unclosed bracket, edited as one block and checked against remark",
    "See [the http://a.com docs {x}\n",
  ],
  [
    "footnotes, repeated and multi-paragraph",
    "One[^a], two[^b], again[^a].\n\n[^a]: First *note*.\n\n    More.\n[^b]: Second.\n",
  ],
  ["tight lists with sublists", "- a\n- b\n  - c\n- d\n"],
  [
    "GFM autolinks only",
    "Visit www.example.com, https://example.com or me@example.com, not example.com.\n",
  ],
  [
    "line breaks between inline HTML",
    '<p align="center">\n  <a href="a">A</a> •\n  <a href="b">B</a>\n  <img src="x.png">\n  <img src="y.png">\n</p>\n',
  ],
  ["HTML blocks stay raw", "<table><tr><td><code>[foo] *a* &lt;b&gt;</code></td></tr></table>\n"],
  [
    "paragraphs holding only HTML",
    '<video src="a.mp4"></video>\n\n<a href="x"><img src="b.png"></a>\n',
  ],
  [
    "Markdown between HTML blocks",
    "<details>\n<summary>More</summary>\n\n- **a** [b]\n\n</details>\n",
  ],
];

// remark-gfm links these URLs in a transform that drops positions; escaping the `[` would change remark's link ends.
const unclosedBeforeUrl = [
  "[http://a.com&amp;b\n\n`{x} http://a.com&b`",
  "~[http://a.com x~",
  "~[http://a.com&amp;b~",
  "[http://a.com}",
  "[http://a.com][r]",
  "[www.a.com",
  "[a@b.com",
  "[http://a.com&amp;b x",
];

describe("migrateContent after an unclosed bracket", () => {
  it.each(
    unclosedBeforeUrl.flatMap((markdown) =>
      (["comark", "plain"] as const).map((syntax) => [markdown, syntax] as const),
    ),
  )(
    "keeps remark's output, Comark's score, and a second run unchanged for %j (%s)",
    async (markdown, syntax) => {
      const once = migrateContent(markdown, { syntax }).markdown;
      expect(migrateContent(once, { syntax }).markdown).toBe(once);
      const reference = await remarkHtml(markdown);
      expect(await remarkHtml(once)).toBe(reference);
      const setup = comarkSetup({ syntax });
      expect(compare(reference, await comarkHtml(once, setup)).score).toBeGreaterThanOrEqual(
        compare(reference, await comarkHtml(markdown, setup)).score,
      );
    },
  );
});

describe("migrateContent with comarkSetup", () => {
  it.each(cases)("renders %s like remark", async (_, markdown) => {
    const { comparison } = await migrated(markdown);
    expect(comparison.differences).toEqual([]);
  });

  it("renders like remark with Comark syntax off and the Markdown untouched", async () => {
    for (const [name, markdown] of cases.filter(
      ([name]) => name !== "single-tilde strikethrough",
    )) {
      const result = await migrated(markdown, "plain");
      if (!name.startsWith("a URL remark leaves as text")) expect(result.markdown).toBe(markdown);
      expect(result.comparison.differences).toEqual([]);
    }
  });

  it("leaves code, HTML, and link labels alone", () => {
    const markdown =
      "`{x} [y] :z`\n\n```\n{x} [y]\n```\n\n<span>[raw]</span>\n\n[a [b]][ref]\n\n[ref]: https://example.com\n";
    const { markdown: out } = migrateContent(markdown);
    expect(out).toContain("`{x} [y] :z`");
    expect(out).toContain("```\n{x} [y]\n```");
    expect(out).toContain("<span>\\[raw\\]</span>");
    expect(out).toContain("[a \\[b\\]][ref]");
  });

  it("lists each change by line", () => {
    expect(migrateContent("ok\n\nH~2~O {x}\n").changes).toEqual([
      { line: 3, kind: "strikethrough", text: "~" },
      { line: 3, kind: "strikethrough", text: "~" },
      { line: 3, kind: "escape", text: "{" },
    ]);
  });

  it("skips frontmatter, including Eleventy's `---js`", () => {
    const markdown = "---js\nconst data = { a: [1] };\n---\n\n{x}\n";
    expect(migrateContent(markdown).markdown).toBe(
      "---js\nconst data = { a: [1] };\n---\n\n\\{x}\n",
    );
  });
});

describe("comarkSetup frontmatter", () => {
  it("drops YAML it can't read with an issue instead of throwing", async () => {
    const document = await parseMarkdown(
      "---\ntitle: {% liquid %} x\n---\n\n# Hi\n",
      comarkSetupOptions(),
    );
    expect(document.nodes).toEqual([["h1", { id: "hi" }, "Hi"]]);
    expect(document.meta.issues).toEqual([expect.stringContaining("isn't valid YAML")]);
  });

  it("reads valid YAML", async () => {
    const document = await parseMarkdown("---\ntitle: Hi\n---\n\ntext\n", comarkSetupOptions());
    expect(document.frontmatter).toEqual({ title: "Hi" });
  });
});

function comarkSetupOptions() {
  const setup = comarkSetup();
  return { ...setup.options, plugins: setup.plugins };
}

describe("review cases", () => {
  const md = (markdown: string, syntax: "comark" | "plain" = "comark") =>
    migrated(markdown, syntax);
  it.each([
    "<https://example.com/{x}>",
    "see https://example.com/{x} now",
    "[a [b]](/u)",
    "~a~~b~",
    "[**x**{.c}][r]\n\n[r]: /u",
    "x[^a]\n\n[^a]: [text]",
    "\\\\[text]",
    "[x{y}]\n\n[x{y}]: /u",
    "Escaped \\[^a].\n\n[^a]: Note.",
    "> [^a]: note\n\nx[^a]",
    "x[^a]\r\n\r\n[^a]: first\r\n\r\n    second",
    "x[^a]\n\n[^a]: [link][r]\n\n[r]: /u",
    "<div>\n\n&amp;lt;\n\n</div>",
    "<textarea>a\n  b",
    "see https://e.test/a_ now",
    '+++\ntitle = "Hi"\n+++\n\nText',
    "---\n---\ntext",
  ])("%j renders like remark, and the rewrite is a no-op for remark", async (markdown) => {
    for (const syntax of ["comark", "plain"] as const) {
      const result = await md(markdown, syntax);
      expect(result.comparison.differences).toEqual([]);
      expect(compare(await remarkHtml(markdown), await remarkHtml(result.markdown)).equal).toBe(
        true,
      );
    }
  });
});

describe("migrateContent with emoji shortcodes", () => {
  it("leaves `:smile:` for Comark's emoji plugin when the project renders shortcodes, and escapes it otherwise", () => {
    expect(migrateContent("Hi :smile: and :note", { emoji: true }).markdown).toBe(
      "Hi :smile: and \\:note",
    );
    expect(migrateContent("Hi :smile:").markdown).toBe("Hi \\:smile:");
  });
});

describe("migrateContent on the PR review's inputs", () => {
  it("leaves `~a~` alone in a project without GFM", () => {
    expect(migrateContent("~a~\n", { gfm: false }).markdown).toBe("~a~\n");
  });

  it.each([
    ["a strikethrough nested in one being widened", "~a~~b~~a~\n"],
    ["a strikethrough in a reference label", "[~a~]\n\n[~a~]: /u\n"],
  ])("reports %s instead of editing it", (_, markdown) => {
    const result = migrateContent(markdown);
    expect(result.markdown).toBe(markdown);
    expect(result.skipped).toEqual([1]);
  });
});
