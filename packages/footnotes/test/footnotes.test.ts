import { createHtmlRenderer, renderHtmlFromDocument } from "@comark/html";
import { createMarkdownParser, parseMarkdown, type ParserOptions } from "comark";
import { describe, expect, it } from "vite-plus/test";
import footnotes, { type FootnotesOptions } from "../src/index.ts";

// The renderer indents blocks; the tests compare the markup alone.
const flat = (html: string) =>
  html
    .replace(/\n[ \t]+/g, "\n")
    .replace(/>\s*\n\s*/g, ">")
    .replace(/\s*\n\s*</g, "<");
const render = async (
  markdown: string,
  options: ParserOptions = {},
  config: FootnotesOptions = {},
) => flat(await createHtmlRenderer({ ...options, plugins: [footnotes(config)] })(markdown));
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [footnotes()] })).meta.issues;

const ref = (id: string, n: number, at = id) =>
  `<sup class="footnote-ref"><a href="#fn-${id}" id="fnref-${at}">[${n}]</a></sup>`;
const back = (id: string) => `<a href="#fnref-${id}" class="footnote-backref">↩</a>`;
const section = (items: string) =>
  `<section class="footnotes"><hr><h2 id="footnotes">Footnotes</h2><ol class="footnotes-list">${items}</ol></section>`;

describe("comark-footnotes", () => {
  it("numbers references in order and lists the notes at the end, in core's nodes", async () => {
    const markdown = "Ducks[^duck] and pigeons[^1].\n\n[^1]: Roof birds.\n[^duck]: Rubber ones.";
    expect(await render(markdown)).toBe(
      `<p>Ducks${ref("duck", 1)} and pigeons${ref("1", 2)}.</p>` +
        section(
          `<li id="fn-duck">Rubber ones. ${back("duck")}</li><li id="fn-1">Roof birds. ${back("1")}</li>`,
        ),
    );
    const { nodes } = await parseMarkdown("A[^1]\n\n[^1]: B", { plugins: [footnotes()] });
    expect(nodes).toEqual([
      [
        "p",
        {},
        "A",
        ["sup", { class: "footnote-ref" }, ["a", { href: "#fn-1", id: "fnref-1" }, "[1]"]],
      ],
      [
        "section",
        { class: "footnotes" },
        ["hr", {}],
        ["h2", { id: "footnotes" }, "Footnotes"],
        [
          "ol",
          { class: "footnotes-list" },
          [
            "li",
            { id: "fn-1" },
            "B",
            " ",
            ["a", { href: "#fnref-1", class: "footnote-backref" }, "↩"],
          ],
        ],
      ],
    ]);
  });

  it("renders Markdown in a definition, where core's plugin keeps it as text", async () => {
    expect(await render("A[^1]\n\n[^1]: Has **bold** and `code`.")).toBe(
      `<p>A${ref("1", 1)}</p>` +
        section(`<li id="fn-1">Has <strong>bold</strong> and <code>code</code>. ${back("1")}</li>`),
    );
  });

  it("reads indented lines and paragraphs into one definition, where core's keeps the first line", async () => {
    const markdown =
      "A[^1]\n\n[^1]: First line\n    second line.\n\n    Second paragraph.\n\nAfter.";
    expect(await render(markdown)).toBe(
      `<p>A${ref("1", 1)}</p><p>After.</p>` +
        section(
          `<li id="fn-1"><p>First line\nsecond line.</p><p>Second paragraph. ${back("1")}</p></li>`,
        ),
    );
  });

  it("extracts definitions nested inside another definition", async () => {
    const markdown = "A[^outer].\n\n[^outer]: Outer [^inner]\n    [^inner]: Inner.";
    expect(await render(markdown)).toBe(
      `<p>A${ref("outer", 1)}.</p>` +
        section(
          `<li id="fn-outer"><p>Outer ${ref("inner", 2)} ${back("outer")}</p></li><li id="fn-inner">Inner. ${back("inner")}</li>`,
        ),
    );
    expect((await issues(markdown)) ?? []).toEqual([]);
  });

  it("leaves a definition inside fenced code alone, where core's empties the code block", async () => {
    const markdown = "A[^1]\n\n```md\n[^1]: Shown as code.\n```\n\n[^1]: The note.";
    expect(await render(markdown)).toBe(
      `<p>A${ref("1", 1)}</p><pre data-language="md"><code class="language-md">[^1]: Shown as code.</code></pre>` +
        section(`<li id="fn-1">The note. ${back("1")}</li>`),
    );
  });

  it("numbers inline notes with the rest, and gives each repeated reference its own id", async () => {
    expect(await render("A^[An *inline* note.] B[^x] C[^x]\n\n[^x]: X.")).toBe(
      `<p>A${ref("note-1", 1)} B${ref("x", 2)} C${ref("x", 2, "x-2")}</p>` +
        section(
          `<li id="fn-note-1">An <em>inline</em> note. ${back("note-1")}</li>` +
            `<li id="fn-x">X. ${back("x")} ${back("x-2")}</li>`,
        ),
    );
  });

  it("reports a reference with no definition and a definition with no reference", async () => {
    expect(await render("Missing [^gone] and a link [^t](https://example.com).")).toBe(
      '<p>Missing [^gone] and a link <a href="https://example.com">^t</a>.</p>',
    );
    expect(await issues("Missing [^gone].\n\n[^spare]: Unused.")).toEqual([
      'footnotes: [^gone] has no definition; add a "[^gone]: …" line, or remove the reference.',
      "footnotes: [^spare]: is never referenced; add [^spare] where it applies, or remove the definition.",
    ]);
  });

  it("names each issue's rule, and reports a label defined twice", async () => {
    const { meta } = await parseMarkdown(
      "A[^1] B[^gone]\n\n[^1]: First.\n\n[^1]: Second.\n\n[^spare]: Unused.",
      { plugins: [footnotes()] },
    );
    expect(meta.issueRules).toEqual({
      'footnotes: [^gone] has no definition; add a "[^gone]: …" line, or remove the reference.':
        "comark/footnotes/missing-definition",
      "footnotes: [^spare]: is never referenced; add [^spare] where it applies, or remove the definition.":
        "comark/footnotes/unused-definition",
      "footnotes: [^1]: is defined more than once, and only the first shows; give the others their own labels, or remove them.":
        "comark/footnotes/duplicate-definition",
    });
    expect(await render("A[^1]\n\n[^1]: First.\n\n[^1]: Second.")).toBe(
      `<p>A${ref("1", 1)}</p>` + section(`<li id="fn-1">First. ${back("1")}</li>`),
    );
  });

  it("takes core's options and its name, so it replaces comark/plugins/footnotes", async () => {
    expect(await render("A[^1]\n\n[^1]: B", {}, { label: "", hr: false, backRef: "back" })).toBe(
      `<p>A${ref("1", 1)}</p><section class="footnotes"><ol class="footnotes-list">` +
        '<li id="fn-1">B <a href="#fnref-1" class="footnote-backref">back</a></li></ol></section>',
    );
    expect(footnotes().name).toBe("footnotes");
  });

  it("works without Comark's default plugins", async () => {
    expect(await render("A[^1]^[B]\n\n[^1]: C", { registerDefaultPlugins: false })).toBe(
      `<p>A${ref("1", 1)}${ref("note-1", 2)}</p>` +
        section(`<li id="fn-1">C ${back("1")}</li><li id="fn-note-1">B ${back("note-1")}</li>`),
    );
  });

  it("shows notes and references a stream hasn't finished", async () => {
    expect(await render("A^[still being writ")).toBe(
      `<p>A${ref("note-1", 1)}</p>` +
        section(`<li id="fn-note-1">still being writ ${back("note-1")}</li>`),
    );
    expect(await render("A[^1")).toBe("<p>A[^1]</p>");

    const parse = createMarkdownParser({ plugins: [footnotes()] });
    let markdown = "";
    let html = "";
    for (const chunk of [
      "One^[first].\n\n",
      "Two^[sec",
      "ond].\n\n",
      "Three[^x].\n\n[^x]: Third.",
    ]) {
      markdown += chunk;
      const document = await parse(markdown, { streaming: true });
      html = flat(await renderHtmlFromDocument(document));
    }
    expect(html).toBe(
      `<p>One${ref("note-1", 1)}.</p><p>Two${ref("note-2", 2)}.</p><p>Three${ref("x", 3)}.</p>` +
        section(
          `<li id="fn-note-1">first ${back("note-1")}</li><li id="fn-note-2">second ${back("note-2")}</li>` +
            `<li id="fn-x">Third. ${back("x")}</li>`,
        ),
    );
  });

  it("promotes an unresolved reference when its definition arrives later", async () => {
    const parse = createMarkdownParser({ plugins: [footnotes()] });
    const first = await parse("A[^x].", { streaming: true });
    expect(flat(await renderHtmlFromDocument(first))).toBe("<p>A[^x].</p>");
    const second = await parse("A[^x].\n\n[^x]: Later.", { streaming: true });
    expect(flat(await renderHtmlFromDocument(second))).toBe(
      `<p>A${ref("x", 1)}.</p>` + section(`<li id="fn-x">Later. ${back("x")}</li>`),
    );
  });
});
