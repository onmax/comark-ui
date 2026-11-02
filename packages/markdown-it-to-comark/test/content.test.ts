import container from "markdown-it-container";
import { full as emoji } from "markdown-it-emoji";
import footnote from "markdown-it-footnote";
import taskLists from "markdown-it-task-lists";
import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vite-plus/test";
import { migrateContent, type ContentOptions } from "../src/content.ts";
import { both, compare } from "./support/index.ts";

async function migrated(markdown: string, options: ContentOptions = {}) {
  const result = migrateContent(markdown, options);
  const md = new MarkdownIt(options.preset ?? "default", options.options ?? {});
  for (const [plugin, ...args] of options.plugins ?? []) md.use(plugin as never, ...(args as []));
  const { markdownIt, comark } = both({
    ...options.options,
    plugins: options.plugins as [unknown, ...unknown[]][],
  });
  return {
    ...result,
    same: md.render(result.markdown) === md.render(markdown),
    comparison: compare(markdownIt(markdown), await comark(result.markdown)),
  };
}

const cases: [string, string, ContentOptions?][] = [
  ["braces Comark reads as attributes", "Set it to {value}, or **bold**{.x}.\n"],
  ["brackets Comark reads as spans", "Arrays like [1, 2] and [foo] = bar.\n"],
  ["colons Comark reads as components", ":smile: and ::note at 10:30\n"],
  [
    "shortcut references",
    "See [docs] and ![logo].\n\n[docs]: https://example.com\n[logo]: logo.png\n",
  ],
  [
    "an unclosed bracket, which Comark would read as a span to the end",
    "Pick one [a or b, then {go} on.\n",
  ],
  ["brackets inside a link's text", "[a [b] c](https://example.com) and [x](y)\n"],
  ["a block component with a space before its name", "::: info\nbody\n:::\n"],
  ["text in lists, quotes, and headings", "# A {x}\n\n> - [b]\n>   {c}\n\n1. :d\n"],
  ["table cells", "| a [x] | {b} |\n|---|---|\n| :c | d |\n"],
  ["table cells with escaped pipes", "| a | b |\n|---|---|\n| `x \\| y[]` [z] | _u \\| v[]_ |\n"],
  ["text with emoji outside the BMP", "- [ ] 🐛 fix [x] {y}\n- 💄 :z\n"],
  ["a paragraph over several lines", "a [b\nc] {d}\n  e :f\n"],
  [
    "code and raw HTML stay as written",
    "`[a]` <span>{b}</span>\n\n    [c]\n\n```\n{d}\n```\n",
    { options: { html: true } },
  ],
  ["HTML shown as text when markdown-it's `html` is off", "<div>{x}</div>\n"],
  ["setext headings", "Title [x]\n===\n"],
  ["CRLF line endings", "a {b}\r\nc [d]\r\n"],
  [
    "containers the project registers",
    "::: warning\n{x}\n:::\n",
    { plugins: [[container, "warning"]] },
  ],
  ["footnotes the project registers", "A[^1] [b]\n\n[^1]: Note {x}\n", { plugins: [[footnote]] }],
  [
    "emoji shortcodes the project renders",
    ":rocket: and :tada: at 10:30\n",
    { plugins: [[emoji]], emoji: true },
  ],
  ["task list checkboxes", "- [ ] todo [x]\n- [x] done\n", { plugins: [[taskLists]], tasks: true }],
];

describe("migrateContent", () => {
  it.each(cases)(
    "keeps markdown-it's output and makes Comark's match: %s",
    async (_, markdown, options) => {
      const result = await migrated(markdown, options);
      expect(result.same).toBe(true);
      expect(result.comparison.differences).toEqual([]);
      expect(migrateContent(result.markdown, options).markdown).toBe(result.markdown);
    },
  );

  it("leaves frontmatter as written, since sites strip it before markdown-it sees the file", () => {
    expect(migrateContent("---\ntitle: {x}\n---\n\n# A {y}\n").markdown).toBe(
      "---\ntitle: {x}\n---\n\n# A \\{y}\n",
    );
  });

  it("checks edits against the whole file too, since a site may render its frontmatter", () => {
    const markdown = "---\n[ref]: /url\n---\n\n[ref]\n";
    const result = migrateContent(markdown);
    expect(new MarkdownIt().render(result.markdown)).toBe(new MarkdownIt().render(markdown));
  });

  it("finds each table cell left to right", () => {
    expect(migrateContent("| [x] | [x]\n| --- | ---\n").markdown).toBe(
      "| \\[x\\] | \\[x\\]\n| --- | ---\n",
    );
  });

  it("lists every change by line", () => {
    const result = migrateContent("a\n\nb {x} [y]\n");
    expect(result.changes.map((change) => [change.line, change.text])).toEqual([
      [3, "{"],
      [3, "["],
      [3, "]"],
    ]);
    expect(result.markdown).toBe("a\n\nb \\{x} \\[y\\]\n");
  });

  it("leaves a block as written when no edit keeps markdown-it's output, and says where", () => {
    // markdown-it-emoji reads `:smile:` after parsing, so escaping its colon would change the output.
    const result = migrateContent("Hi :smile:\n", { plugins: [[emoji]] });
    expect(result.markdown).toBe("Hi :smile:\n");
    expect(result.skipped).toEqual([1]);
  });

  it("checks every edit against the other setups that may render the document", () => {
    const result = migrateContent("::: warning\nx\n:::\n", {
      alternatives: [{ plugins: [[container, "warning"]] }],
    });
    expect(result.markdown).toBe("::: warning\nx\n:::\n");
    expect(result.skipped).toEqual([1]);
  });

  it("changes nothing with plain syntax", () => {
    expect(migrateContent("a {b} [c]\n", { syntax: "plain" }).markdown).toBe("a {b} [c]\n");
  });
});
