import { createHtmlRenderer } from "@comark/html";
import { createMarkdownParser, type ParserOptions } from "comark";
import { describe, expect, it } from "vite-plus/test";
import cjk from "../src/index.ts";

// The renderer indents blocks; the tests compare the markup alone.
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const render = async (markdown: string, options: ParserOptions = {}) =>
  flat(await createHtmlRenderer({ ...options, plugins: [cjk()] })(markdown));

describe("comark-cjk", () => {
  it("bolds Japanese, Chinese, and Korean that end in punctuation before the next word", async () => {
    expect(await render("**この文は太字。**次の文")).toBe(
      "<p><strong>この文は太字。</strong>次の文</p>",
    );
    expect(await render("**这是粗体。**下一句")).toBe("<p><strong>这是粗体。</strong>下一句</p>");
    expect(await render("**이 문장은 굵게.**다음 문장")).toBe(
      "<p><strong>이 문장은 굵게.</strong>다음 문장</p>",
    );
  });

  it("reads italics and strikethrough around brackets and punctuation", async () => {
    expect(await render("*「強調」*です")).toBe("<p><em>「強調」</em>です</p>");
    expect(await render("**〔重要〕**です")).toBe("<p><strong>〔重要〕</strong>です</p>");
    expect(await render("~~削除。~~次")).toBe("<p><del>削除。</del>次</p>");
  });

  it("leaves Latin text as CommonMark reads it", async () => {
    expect(await render("a**b**c, **foo.**bar, and *it*")).toBe(
      "<p>a<strong>b</strong>c, **foo.**bar, and <em>it</em></p>",
    );
  });

  it("works without Comark's default plugins", async () => {
    expect(await render("**この文は太字。**次の文", { registerDefaultPlugins: false })).toBe(
      "<p><strong>この文は太字。</strong>次の文</p>",
    );
  });

  it("closes emphasis a stream leaves open, and keeps the rest of the stream", async () => {
    expect(await render("前の文。**太字。")).toBe("<p>前の文。<strong>太字。</strong></p>");
    const parse = createMarkdownParser({ plugins: [cjk()] });
    await parse("**この文は", { streaming: true });
    const document = await parse("**この文は太字。**次の文", { streaming: true });
    expect(document.nodes).toMatchObject([["p", {}, ["strong", {}, "この文は太字。"], "次の文"]]);
  });
});
