import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { describe, expect, it, vi } from "vite-plus/test";
import math, { components, type MathOptions } from "../src/html.ts";

const render = (markdown: string, options?: MathOptions) =>
  createHtmlRenderer({ plugins: [math(options)], components })(markdown);
const parse = (markdown: string, options?: MathOptions) =>
  parseMarkdown(markdown, { plugins: [math(options)] });
/** Each formula's TeX, with `$$` for display math, in document order. */
const formulas = async (markdown: string) => {
  const html = await render(markdown);
  return [
    ...html.matchAll(
      /<span class="cmh( cmh-display)?">.*?encoding="application\/x-tex">(.*?)<\/annotation>/g,
    ),
  ].map(([, display, tex]) => (display ? `$$${tex}$$` : tex));
};

describe("comark-mathml", () => {
  it("preserves authored components that resemble generated formula markers", async () => {
    vi.resetModules();
    const { default: freshMath } = await import("../src/index.ts");
    const authored = "::comark-mathml-0{index=0}\n\n::comark-mathml-1{index=0}";
    const markdown = `$x$\n\n${authored}`;
    const original = await parseMarkdown(authored);
    const tree = await parseMarkdown(markdown, { plugins: [freshMath()] });
    expect(tree.nodes.slice(1)).toEqual(original.nodes);
    const html = await createHtmlRenderer({ plugins: [freshMath()], components })(markdown);
    expect(html).toContain(await createHtmlRenderer()(authored));
    expect(html.match(/<mi>x<\/mi>/g)).toHaveLength(1);
  });

  it("typesets inline and display math as MathML, with the styles once", async () => {
    const html = await render("Mass $E = mc^2$ and\n\n$$\n\\frac{a}{b}\n$$\n");
    expect(html).toContain(
      '<span class="cmh"><math><semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn class="tml-sml-pad">2</mn></msup></mrow><annotation encoding="application/x-tex">E = mc^2</annotation></semantics></math></span>',
    );
    expect(html).toContain(
      '<span class="cmh cmh-display"><math display="block" class="tml-display" style="display:block math;"><semantics><mfrac><mi>a</mi><mi>b</mi></mfrac>',
    );
    expect(html.match(/<style data-comark-mathml>/g)).toHaveLength(1);
    expect(html).not.toContain("<script");
  });

  it("reads each delimiter and a math fence", async () => {
    expect(
      await formulas(
        [
          "Inline $a$ and \\(b\\), display $$c$$ and \\[d\\] in text.",
          "$$\ne\n$$",
          "\\[\nf\n\\]",
          "$$g$$",
          "```math\nh\n```",
          "> $$\n> i\n> $$",
          "- \\[\n  j\n  \\]",
        ].join("\n\n"),
      ),
    ).toEqual(["a", "b", "$$c$$", "$$d$$", "$$e$$", "$$f$$", "$$g$$", "$$h$$", "$$i$$", "$$j$$"]);
  });

  it("leaves code spans, code fences, and escaped dollars alone", async () => {
    const markdown = [
      "Run `echo $HOME and $PATH` or `$x$`, and pay \\$3 for \\$x\\$.",
      "```sh\necho $$x$$ \\(y\\)\n```",
      "    $$indented code$$",
    ].join("\n\n");
    expect(await formulas(markdown)).toEqual([]);
    expect(await render(markdown)).toContain("<code>echo $HOME and $PATH</code>");
  });

  it("keeps prices and citations as text", async () => {
    const markdown =
      "It costs $5 and $10, or US$20 to $30. See \\[1\\] and \\[2, 3\\].\n\n\\[4\\]\n\n$ x $ is not math.";
    expect(await formulas(markdown)).toEqual([]);
    const html = await render(markdown);
    expect(html).toContain("It costs $5 and $10, or US$20 to $30. See [1] and [2, 3].");
    expect(html).toContain("$ x $ is not math.");
  });

  it("closes `$` before a non-digit after a non-space, as Pandoc does", async () => {
    expect(await formulas("From $a$ to $b$, and $x + y = 2$.")).toEqual(["a", "b", "x + y = 2"]);
  });

  it("shows an unclosed formula as its source", async () => {
    for (const markdown of [
      "Say $\\frac{a",
      "Say \\(\\frac{a",
      "$$\n\\frac{a}{",
      "\\[\n\\frac{a",
    ]) {
      const tree = await parse(markdown);
      expect(tree.meta.issues ?? [], markdown).toHaveLength(markdown.includes("$") ? 1 : 0);
      expect(await render(markdown), markdown).not.toContain("<math");
    }
    expect(await render("$$\n\\frac{a}{")).toContain(
      '<span class="cmh cmh-display cmh-source">\\frac{a}{</span>',
    );
    expect((await parse("$$\n\\frac{a}\n$$\n")).meta.issues).toHaveLength(1);
  });

  it("reports closed invalid formulas at EOF, including with auto-close disabled", async () => {
    for (const markdown of ["Bad $\\frac{a}$", "$$\n\\frac{a}\n$$", "Bad $$\\frac{a}$$"]) {
      for (const autoClose of [true, false]) {
        const tree = await parseMarkdown(markdown, { plugins: [math()], autoClose });
        expect(tree.meta.issues, markdown).toHaveLength(1);
        expect(Object.values(tree.meta.issueRules ?? {})).toEqual(["comark/math/invalid-tex"]);
      }
    }
  });

  it("preserves authored MathML and unrelated math components", async () => {
    for (const markdown of ["<math><mi>x</mi></math>", "::math\nHello\n::"]) {
      const original = await parseMarkdown(markdown);
      expect((await parse(markdown)).nodes).toEqual(original.nodes);
      expect(await render(markdown)).toEqual(await createHtmlRenderer()(markdown));
    }
    expect(await render("<math><mi>x</mi></math>")).toContain("<mi>x</mi>");
  });

  it("renders invalid TeX as its source and reports it", async () => {
    const markdown = "Bad $\\frac{a}$ and $$\\begin{matrix} a$$\n\nGood $x$.\n";
    const tree = await parse(markdown);
    expect(tree.meta.issues).toEqual([
      "Math `\\frac{a}` failed to typeset: Unexpected end of input in a macro argument, expected '}'. Fix the TeX or wrap it in code.",
      "Math `\\begin{matrix} a` failed to typeset: Expected & or \\\\ or \\cr or \\end. Fix the TeX or wrap it in code.",
    ]);
    expect(Object.values(tree.meta.issueRules ?? {})).toEqual([
      "comark/math/invalid-tex",
      "comark/math/invalid-tex",
    ]);
    const html = await render(markdown);
    expect(html).toContain('<span class="cmh cmh-source">\\frac{a}</span>');
    expect(html).toContain('<span class="cmh cmh-display cmh-source">\\begin{matrix} a</span>');
    expect(html).toContain("<mi>x</mi>");
  });

  it("escapes the source of a formula it can't typeset", async () => {
    expect(await render("$\\frac{<b>}$")).toContain(
      '<span class="cmh cmh-source">\\frac{&lt;b&gt;}</span>',
    );
  });

  it("refuses links and caps expansion", async () => {
    const tree = await parse("$\\href{javascript:alert(1)}{x}$ and $\\def\\a{\\a\\a}\\a$ here.");
    expect(tree.meta.issues).toHaveLength(2);
    expect(await render("$\\href{javascript:alert(1)}{x}$")).not.toContain('javascript:alert(1)"');
  });

  it("uses `macros`, and KaTeX's HTML for `output`", async () => {
    expect(await render("$\\R$", { macros: { "\\R": "\\mathbb{R}" } })).toContain("<mi>ℝ</mi>");
    const html = await render("$x$", { output: "html" });
    expect(html).toContain('<span class="cmh"><span class="katex"><span class="katex-html"');
    expect(html).not.toContain("<math");
    expect(await render("$x$", { output: "htmlAndMathml" })).toContain(
      '<span class="katex-mathml"><math',
    );
  });

  it("adds to the issues other plugins report", async () => {
    const other = defineComarkPlugin(() => ({
      name: "other",
      post(state) {
        state.tree.meta.issues = [...(state.tree.meta.issues ?? []), "Other issue."];
        state.tree.meta.issueRules = { "Other issue.": "other/rule" };
      },
    }));
    const tree = await parseMarkdown("$\\frac{a}$ fails.", { plugins: [other(), math()] });
    expect(tree.meta.issues).toEqual([
      "Other issue.",
      "Math `\\frac{a}` failed to typeset: Unexpected end of input in a macro argument, expected '}'. Fix the TeX or wrap it in code.",
    ]);
    expect(Object.keys(tree.meta.issueRules ?? {})).toHaveLength(2);
  });

  it("takes the place of Comark's math plugin", async () => {
    const { default: core } = await import("comark/plugins/math");
    expect(math().name).toBe(core().name);
    const html = await createHtmlRenderer({ plugins: [math(), core()], components })("$x$");
    expect(html).toContain('<span class="cmh"><math>');
  });
});
