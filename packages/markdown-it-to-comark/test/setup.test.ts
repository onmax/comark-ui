import { renderHtml } from "@comark/html";
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
