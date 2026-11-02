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
    const result = await both("Set {value} first.\n");
    expect(result.equal).toBe(false);
    expect(result.differences.map((difference) => difference.category).length).toBeGreaterThan(0);
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
