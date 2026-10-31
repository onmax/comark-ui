import { describe, expect, it } from "vite-plus/test";
import { compare, comarkHtml, remarkHtml } from "./support/index.ts";

const both = async (markdown: string) =>
  compare(await remarkHtml(markdown), await comarkHtml(markdown));

describe("compare", () => {
  it("treats plain GFM as the same", async () => {
    const result = await both(
      "# Title\n\nSome *text* and `code`.\n\n| a | b |\n|:--|--:|\n| 1 | 2 |\n\n- [x] done\n\n```js\nconst a = 1\n```\n",
    );
    expect(result.differences).toEqual([]);
    expect(result.equal).toBe(true);
  });

  it("ignores whitespace between blocks and inside pretty-printed HTML", () => {
    expect(
      compare(
        "<p>a <em>b</em></p>\n<ul>\n<li>c</li>\n</ul>",
        "<p>\n  a <em>b</em>\n</p><ul><li>c</li></ul>",
      ).equal,
    ).toBe(true);
  });

  it("keeps whitespace inside code blocks", () => {
    expect(
      compare("<pre><code>a  b\n</code></pre>", "<pre><code>a b</code></pre>").differences[0]
        ?.category,
    ).toBe("code-text");
  });

  it("names the block Comark reads differently", async () => {
    const result = await both("A note.[^1]\n\n[^1]: The note.\n");
    expect(result.equal).toBe(false);
    expect(result.score).toBeLessThan(1);
    expect(result.differences.map((difference) => difference.category)).toContain(
      "missing:section",
    );
  });

  it("reports text Comark reads as attributes", async () => {
    const result = await both("Set it to {value} first.\n");
    expect(result.differences[0]).toMatchObject({
      category: "text",
      expected: "Set it to {value} first.",
    });
  });
});

describe("compare is strict about what renders", () => {
  it.each([
    ["spaces around an image", '<p>a <img src="x"> b</p>', '<p>a<img src="x">b</p>'],
    ["a no-break space", "<p>a&nbsp;b</p>", "<p>a b</p>"],
    [
      "a newline inside highlighted code",
      "<pre><code>a\n<span>b</span>\n</code></pre>",
      "<pre><code>a<span>b</span></code></pre>",
    ],
    [
      "a space inside a CSS value",
      '<p style="margin:1px 2px">x</p>',
      '<p style="margin:1px2px">x</p>',
    ],
    [
      "an image's align",
      '<p><img align="left" src="x"></p>',
      '<p><img style="text-align:left" src="x"></p>',
    ],
    ["an authored heading id", '<h2 id="old">A</h2>', '<h2 id="new">A</h2>'],
    ["a quote inside an attribute", `<div a='x" b="y'>T</div>`, '<div a="x" b="y">T</div>'],
    [
      "template content",
      '<template name="x"><p>KEEP</p></template>',
      '<template name="x"><p>GONE</p></template>',
    ],
  ])("sees %s", (_, expected, actual) => {
    expect(compare(expected, actual).equal).toBe(false);
  });

  it.each([
    ["Comark's heading ids", "<h2>A</h2>", '<h2 id="a">A</h2>'],
    ["a comment between words", "<p>a <!--c--> b</p>", "<p>a b</p>"],
    ["remark's final code newline", "<pre><code>a\n</code></pre>", "<pre><code>a</code></pre>"],
  ])("ignores %s", (_, expected, actual) => {
    expect(compare(expected, actual).equal).toBe(true);
  });

  it("scores additions as well as losses", () => {
    expect(compare("<p>x</p>", "<p>x</p><h1>UNEXPECTED</h1>").score).toBeLessThan(1);
    expect(compare("", "<p>x</p>").score).toBe(0);
  });
});
