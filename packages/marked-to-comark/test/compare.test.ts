import { renderHtml } from "@comark/html";
import { describe, expect, it } from "vite-plus/test";
import { comarkHtml, comarkOptions, comarkSetup, compare, markedHtml } from "./support/index.ts";

const both = async (markdown: string, options = {}) =>
  compare(markedHtml(markdown, options), await comarkHtml(markdown, comarkSetup()));

describe("comarkOptions reads Markdown like marked", () => {
  it("treats plain GFM as the same", async () => {
    const result = await both(
      "# Title\n\nSome *text* and `code`.\n\n| a | b |\n|:--|--:|\n| 1 | 2 |\n\n- [x] done\n\n```js\nconst a = 1\n```\n\n~~gone~~ https://example.com\n",
    );
    expect(result.differences).toEqual([]);
  });

  it("writes single line breaks as <br> with breaks: true", async () => {
    const markdown = "one\ntwo\n";
    expect(
      compare(
        markedHtml(markdown, { breaks: true }),
        await comarkHtml(markdown, comarkSetup({ breaks: true })),
      ).differences,
    ).toEqual([]);
  });

  it("names the block Comark reads differently", async () => {
    const result = await both("Set `it`{value} first.\n");
    expect(result.equal).toBe(false);
    expect(result.differences.map((difference) => difference.category).length).toBeGreaterThan(0);
  });
});

describe("version settings", () => {
  it("splits tables as marked 0.3 did, whatever the delimiter row's width", async () => {
    const setup = comarkSetup({ legacyTables: true });
    for (const markdown of [
      "a | b\n--- | --- | ---\nx | y\n",
      "| a | b |\n| --- | --- |\n| x | p \\| q |\n",
      "    a | b\n    - | -\n",
    ])
      await expect(comarkHtml(markdown, setup)).resolves.toBeTruthy();
    expect(await comarkHtml("| a | b |\n| --- | --- |\n| x | p \\| q |\n", setup)).toContain(
      "<td>p \\</td><td>q</td>",
    );
    expect(await comarkHtml("    a | b\n    - | -\n", setup)).toContain("<pre>");
  });

  it("numbers empty headings among marked's heading ids", async () => {
    expect(
      await comarkHtml("##\n\n## !!!\n", comarkSetup({ headerIds: true, headerPrefix: "doc-" })),
    ).toBe('<h2 id="doc-"></h2><h2 id="doc--1">!!!</h2>');
  });

  it("links only emails written as emails", async () => {
    const html = await comarkHtml("a&#64;b.co, a\\@b.co, and a@b.co\n", comarkSetup());
    expect(html.match(/mailto:/g)).toHaveLength(1);
  });
});

describe("streaming", () => {
  // A chat reply arrives a few tokens at a time. marked shows an unfinished `**bold` as asterisks until the closing
  // pair arrives; Comark with autoClose draws it bold at every step.
  it("closes unfinished Markdown with autoClose", async () => {
    const partial = "The answer is **forty";
    expect(markedHtml(partial)).toContain("**forty");
    expect(await renderHtml(partial, { ...comarkOptions(), autoClose: true })).toContain(
      "<strong>forty</strong>",
    );
    // Static files are complete, so comarkOptions() leaves auto-close off.
    expect(await renderHtml(partial, comarkOptions())).not.toContain("<strong>");
  });
});
