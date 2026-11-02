import { renderHtml } from "@comark/html";
import { markedHighlight as original } from "marked-highlight";
import { describe, expect, it } from "vite-plus/test";
import { markedHighlight } from "../src/plugins/index.ts";
import { comarkHtml, comarkSetup, compare, markedHtml } from "./support/index.ts";

// A highlighter like highlight.js: keywords in spans, the rest escaped.
const highlight = (code: string, lang: string) =>
  code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /\b(const|return|function)\b/g,
      `<span class="hljs-keyword" data-lang="${lang}">$1</span>`,
    );

const documents = [
  "```js\nconst a = 1 < 2;\nreturn a;\n```\n",
  "```ts title=a.ts\nfunction f() {}\n```\n",
  "```\nplain & text\n```\n",
  "- item\n\n  ```js\n  const nested = true;\n  ```\n",
];

describe("markedHighlight", () => {
  it.each([
    [{ highlight }],
    [{ highlight, langPrefix: "hljs language-" }],
    [{ highlight, emptyLangClass: "hljs" }],
    [{ async: true, highlight: async (code: string, lang: string) => highlight(code, lang) }],
  ])("renders what marked with marked-highlight renders: %o", async (options) => {
    for (const markdown of documents) {
      // SAFETY: each case is a valid marked-highlight options object; the union only defeats its overloads.
      const expected = await new (
        await import("marked")
      ).Marked(original(options as never)).parse(markdown);
      const actual = await comarkHtml(
        markdown,
        comarkSetup({ plugins: [markedHighlight(options)] }),
      );
      expect(compare(expected, actual).differences, markdown).toEqual([]);
    }
  });

  it("leaves code a highlighter returns unchanged as text", async () => {
    const markdown = "```js\na < b\n```\n";
    const options = { highlight: (code: string) => code };
    expect(
      compare(
        markedHtml(markdown, {}, [original(options)]),
        await comarkHtml(markdown, comarkSetup({ plugins: [markedHighlight(options)] })),
      ).equal,
    ).toBe(true);
  });

  it("draws through the real renderer", async () => {
    expect(
      await renderHtml(documents[0]!, {
        ...comarkSetup({ plugins: [markedHighlight({ highlight })] }).options,
        plugins: comarkSetup({ plugins: [markedHighlight({ highlight })] }).plugins,
      }),
    ).toContain('<span class="hljs-keyword" data-lang="js">const</span>');
  });
});
