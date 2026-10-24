import { createHtmlRenderer } from "@comark/html";
import { createMarkdownParser, parseMarkdown, type ParserOptions } from "comark";
import footnotes from "comark/plugins/footnotes";
import { describe, expect, it } from "vite-plus/test";
import mark from "../src/index.ts";

const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const render = async (markdown: string, options: ParserOptions = {}) =>
  flat(
    await createHtmlRenderer({ ...options, plugins: [mark(), ...(options.plugins ?? [])] })(
      markdown,
    ),
  );

describe("comark-mark", () => {
  it("renders ==text== as mark and ^text^ as sup, with Markdown inside", async () => {
    expect(await render("The ==deploy freeze== starts at 10^30^, ==not **after** lunch==.")).toBe(
      "<p>The <mark>deploy freeze</mark> starts at 10<sup>30</sup>, " +
        "<mark>not <strong>after</strong> lunch</mark>.</p>",
    );
  });

  it("keeps the AST to plain mark and sup nodes", async () => {
    const { nodes } = await parseMarkdown("==a== x^2^", { plugins: [mark()] });
    expect(nodes).toEqual([["p", {}, ["mark", {}, "a"], " x", ["sup", {}, "2"]]]);
  });

  it("leaves single =, spaced carets, code, and ~sub~ alone", async () => {
    expect(await render("a = b, ^not this^, `==code==`, H~2~O")).toBe(
      "<p>a = b, ^not this^, <code>==code==</code>, H~2~O</p>",
    );
    expect(await render("2^10\\ 3^")).toBe("<p>2<sup>10 3</sup></p>");
  });

  it("takes {attributes} after a mark", async () => {
    expect(await render("==hot=={.warning}")).toBe('<p><mark class="warning">hot</mark></p>');
  });

  it("doesn't read footnote references as superscripts", async () => {
    const markdown = "Pigeons[^1] and ducks[^2].\n\n[^1]: On the roof.\n[^2]: In the bath.";
    const options = { plugins: [footnotes()] };
    expect(await render(markdown, options)).toBe(flat(await createHtmlRenderer(options)(markdown)));
    expect(await render("x[^1][^2]", { registerDefaultPlugins: false })).toBe("<p>x[^1][^2]</p>");
    expect(await render("x[^1]")).toBe("<p>x[^1]</p>");
  });

  it("renders without Comark's default plugins", async () => {
    expect(await render("==a== b^2^", { registerDefaultPlugins: false })).toBe(
      "<p><mark>a</mark> b<sup>2</sup></p>",
    );
  });

  it("leaves an unclosed mark as text while streaming", async () => {
    const parse = createMarkdownParser({ plugins: [mark()] });
    await parse("The ==deploy", { streaming: true });
    expect((await parse("The ==deploy freeze", { streaming: true })).nodes).toMatchObject([
      ["p", {}, "The ==deploy freeze"],
    ]);
    expect((await parse("The ==deploy freeze== ends", { streaming: true })).nodes).toMatchObject([
      ["p", {}, "The ", ["mark", {}, "deploy freeze"], " ends"],
    ]);
    expect(await render("**bold ==mark")).toBe("<p><strong>bold ==mark</strong></p>");
  });
});
