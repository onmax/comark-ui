import { renderHtml } from "@comark/html";
import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import { describe, expect, it } from "vite-plus/test";
import { comarkOptions } from "../src/setup.ts";
import { both, compare } from "./support/index.ts";

const DOCUMENT = [
  "# Title",
  "",
  'Some *text* with "quotes" -- (c) and a URL, www.example.com, and a <b>tag</b>.',
  "A line break here",
  "and ~~struck~~ text.",
  "",
  "- tight",
  "- list",
  "",
  "| a | b |",
  "| - | - |",
  "| 1 | 2 |",
  "",
  "<div>raw *block*</div>",
  "",
  "<!-- a comment -->",
  "",
  "```js",
  "const a = 1;",
  "```",
  "",
].join("\n");

describe("comarkSetup", () => {
  it.each([
    ["markdown-it's defaults", {}],
    ["raw HTML", { html: true }],
    ["linkify", { linkify: true }],
    ["the typographer", { typographer: true }],
    ["breaks", { breaks: true }],
    ["all of them", { html: true, linkify: true, typographer: true, breaks: true }],
    ["the commonmark preset", { preset: "commonmark" as const }],
    ["the zero preset", { preset: "zero" as const }],
    [
      "the zero preset with rules enabled",
      { preset: "zero" as const, enable: ["emphasis", "heading"] },
    ],
    ["rules disabled", { disable: ["table", "strikethrough"] }],
  ])("reads Markdown like markdown-it with %s", async (_, options) => {
    const { markdownIt, comark } = both({ syntax: "plain", ...options });
    const comparison = compare(markdownIt(DOCUMENT), await comark(DOCUMENT));
    expect(comparison.differences).toEqual([]);
  });

  it("applies rule changes in order, after the plugins", async () => {
    const markdown = "*hi* and a^[note]\n";
    for (const rules of [
      [
        ["disable", ["emphasis"]],
        ["enable", ["emphasis"]],
      ],
      [
        ["enable", ["emphasis"]],
        ["disable", ["emphasis"]],
      ],
      [["disable", ["footnote_inline"]]],
    ] as ["enable" | "disable", string[]][][]) {
      const md = new MarkdownIt().use(footnote as never);
      for (const [method, names] of rules) md[method](names);
      const { comark } = both({ syntax: "plain", rules, plugins: [[footnote]] });
      expect(compare(md.render(markdown), await comark(markdown)).differences).toEqual([]);
    }
  });

  it("writes an image's alt text without its markup", async () => {
    const { markdownIt, comark } = both({ syntax: "plain" });
    const markdown = "![**hi** `c` ![x](y.png)](a.png)\n";
    expect(compare(markdownIt(markdown), await comark(markdown)).differences).toEqual([]);
  });

  it("shows a comment as text when HTML is off, as markdown-it does", async () => {
    const { markdownIt, comark } = both({ syntax: "plain" });
    expect(compare(markdownIt("<!-- a -->"), await comark("<!-- a -->")).equal).toBe(true);
  });

  it("reads frontmatter only when asked", async () => {
    const markdown = "---\ntitle: A\n---\n\n# B\n";
    expect(await renderHtml(markdown, comarkOptions())).toContain("title: A");
    expect(await renderHtml(markdown, comarkOptions({ frontmatter: true }))).not.toContain("title");
  });

  it("goes straight into renderHtml, alone or with components", async () => {
    expect(await renderHtml("# Hi", comarkOptions({ html: false }))).toContain("Hi");
    expect(await renderHtml("# Hi", { ...comarkOptions(), components: {} })).toContain("Hi");
  });
});
