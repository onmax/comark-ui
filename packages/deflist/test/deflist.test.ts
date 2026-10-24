import { createHtmlRenderer } from "@comark/html";
import { createMarkdownParser, parseMarkdown, type ParserOptions } from "comark";
import { describe, expect, it } from "vite-plus/test";
import deflist from "../src/index.ts";

// The renderer indents blocks; the tests compare the markup alone.
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const render = async (markdown: string, options: ParserOptions = {}) =>
  flat(await createHtmlRenderer({ ...options, plugins: [deflist()] })(markdown));

describe("comark-deflist", () => {
  it("renders a term and its definitions as a native dl, with : or ~", async () => {
    expect(await render("Pigeon\n: A bird that sits on the roof.\n~ A deploy blocker.")).toBe(
      "<dl><dt>Pigeon</dt><dd>A bird that sits on the roof.</dd><dd>A deploy blocker.</dd></dl>",
    );
  });

  it("reads several terms, with inline Markdown in terms and definitions", async () => {
    expect(await render("**Duck**\n: Rubber, for `debugging`.\n\nGoose\n: Loud.")).toBe(
      "<dl><dt><strong>Duck</strong></dt><dd>Rubber, for <code>debugging</code>.</dd>" +
        "<dt>Goose</dt><dd>Loud.</dd></dl>",
    );
  });

  it("continues a definition with indented paragraphs, lists, and code", async () => {
    const markdown = [
      "Pizza",
      ":   Ordered on Fridays.",
      "",
      "    Pineapple needs a **vote**.",
      "",
      "    - margherita",
      "    - diavola",
      "",
      "    ```sh",
      "    order --size large",
      "    ```",
    ].join("\n");
    expect(await render(markdown)).toBe(
      "<dl><dt>Pizza</dt><dd><p>Ordered on Fridays.</p><p>Pineapple needs a <strong>vote</strong>.</p>" +
        "<ul><li>margherita</li><li>diavola</li></ul>" +
        '<pre data-language="sh"><code class="language-sh">order --size large</code></pre></dd></dl>',
    );
  });

  it("keeps paragraphs in a loose list and drops them in a tight one, without autoUnwrap", async () => {
    expect(await render("Term\n: Tight.", { autoUnwrap: false })).toBe(
      "<dl><dt>Term</dt><dd>Tight.</dd></dl>",
    );
    expect(await render("A\n: One.\n\n  More.\n\nB\n: Two.", { autoUnwrap: false })).toBe(
      "<dl><dt>A</dt><dd><p>One.</p><p>More.</p></dd><dt>B</dt><dd><p>Two.</p></dd></dl>",
    );
  });

  it("accepts empty definitions and rejects indented markers", async () => {
    expect(await render("Term\n:\n\nNext\n: Def.")).toBe(
      "<dl><dt>Term</dt><dd></dd><dt>Next</dt><dd>Def.</dd></dl>",
    );
    expect(await render("Term\n:   \n: Second.")).toBe(
      "<dl><dt>Term</dt><dd></dd><dd>Second.</dd></dl>",
    );
    // autoClose drops a lone `:` that ends the document as an unfinished `:component`, before the plugin runs.
    expect(await render("Term\n:", { autoClose: false })).toBe("<dl><dt>Term</dt><dd></dd></dl>");
    // Indented code can't interrupt a paragraph, so the marker line continues the term's paragraph.
    expect(await render("Term\n    : not a definition")).toBe("<p>Term: not a definition</p>");
    expect(await render("Term\n\n: Loose.", { autoUnwrap: false })).toBe(
      "<dl><dt>Term</dt><dd><p>Loose.</p></dd></dl>",
    );
  });

  it("leaves a colon with no space, or with no term above it, as text", async () => {
    expect(await render("Ratio\n:3 to 1", { registerDefaultPlugins: false })).toBe(
      "<p>Ratio\n:3 to 1</p>".replace("\n", ""),
    );
    expect(await render(": no term")).toBe("<p>: no term</p>");
  });

  it("renders without Comark's default plugins, and inside a component", async () => {
    expect(await render("Term\n: Def.", { registerDefaultPlugins: false })).toBe(
      "<dl><dt>Term</dt><dd>Def.</dd></dl>",
    );
    expect(await render("::note\nTerm\n: Def.\n::")).toBe(
      "<note><dl><dt>Term</dt><dd>Def.</dd></dl></note>",
    );
  });

  it("closes what a stream leaves open inside a definition", async () => {
    expect(await render("Term\n: **bold and `code")).toBe(
      "<dl><dt>Term</dt><dd><strong>bold and <code>code</code></strong></dd></dl>",
    );
    const parse = createMarkdownParser({ plugins: [deflist()] });
    await parse("Term\n", { streaming: true });
    const document = await parse("Term\n: Def", { streaming: true });
    expect(document.nodes).toMatchObject([["dl", {}, ["dt", {}, "Term"], ["dd", {}, "Def"]]]);
  });

  it("keeps the AST to plain dl, dt, and dd nodes", async () => {
    const { nodes } = await parseMarkdown("Term\n: Def.", { plugins: [deflist()] });
    expect(nodes).toEqual([["dl", {}, ["dt", {}, "Term"], ["dd", {}, "Def."]]]);
  });
});
