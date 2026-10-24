import { createHtmlRenderer } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import xref from "../src/index.ts";

const render = async (markdown: string, options = {}) =>
  (await createHtmlRenderer({ plugins: [xref(options)] })(markdown))
    .replace(/>\s+</g, "><")
    .replace(/\s+<\//g, "</")
    .replace(/\s+/g, " ");
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [xref()] })).meta.issues;
const table = (id: string, caption = "") =>
  `::table{#${id}${caption ? ` caption="${caption}"` : ""}}\n| a | b |\n| --- | --- |\n| 1 | 2 |\n::`;

describe("comark-xref", () => {
  it("turns a labeled image into a numbered figure, and a reference into a link to it", async () => {
    const html = await render(
      "See :ref{#fig-after}.\n\n![Before](before.png){#fig-before}\n\n![After & now](after.png){#fig-after width=300}",
    );
    expect(html).toContain('<p>See <a href="#fig-after" class="cxr-ref">Figure 2</a>.</p>');
    expect(html).toContain(
      '<figure id="fig-before" class="cxr"><img src="before.png" alt="Before"><figcaption><span class="cxr-label">Figure 1:</span> Before</figcaption></figure>',
    );
    expect(html).toContain(
      '<img src="after.png" alt="After &amp; now" width="300"><figcaption><span class="cxr-label">Figure 2:</span> After & now</figcaption>',
    );
  });

  it("numbers tables apart from figures, and captions them", async () => {
    const html = await render(
      `![A](a.png){#fig-a}\n\n${table("tbl-times", "Homing times")}\n\n${table("tbl-plain")}\n\n:ref{#tbl-plain}`,
    );
    expect(html).toContain(
      '<table id="tbl-times" class="cxr"><caption><span class="cxr-label">Table 1:</span> Homing times</caption><thead>',
    );
    expect(html).toContain('<caption><span class="cxr-label">Table 2</span></caption>');
    expect(html).toContain('<a href="#tbl-plain" class="cxr-ref">Table 2</a>');
  });

  it("numbers a figure block of its own as it is, and takes its words from the options", async () => {
    const html = await render(
      "::figure{#fig-chart}\n![Chart](c.png)\n::\n\n:ref{#fig-chart} and :ref{#tbl-x}\n\n" +
        table("tbl-x"),
      { figure: "Abbildung", table: "Tabelle" },
    );
    expect(html).toContain(
      '<a href="#fig-chart" class="cxr-ref">Abbildung 1</a> and <a href="#tbl-x" class="cxr-ref">Tabelle 1</a>',
    );
  });

  it("numbers labeled custom figure elements", async () => {
    const html = await render("::screenshot{#fig-shot}\n![Shot](shot.png)\n::\n\n:ref{#fig-shot}");
    expect(html).toContain('<a href="#fig-shot" class="cxr-ref">Figure 1</a>');
  });

  it("renders references the same in Vue and React", async () => {
    const value = await parseMarkdown("![A](a.png){#fig-a}\n\nSee :ref{#fig-a}.", {
      plugins: [xref()],
    });
    const vue = await renderVue(createSSRApp({ render: () => h(VueDocument, { value }) }));
    const react = renderReact(createElement(ReactDocument, { value }));
    for (const html of [vue, react]) {
      expect(html).toContain('<a href="#fig-a" class="cxr-ref">Figure 1</a>');
      expect(html).toContain('<span class="cxr-label">Figure 1:</span> A</figcaption>');
    }
  });

  it("reports each problem, naming the reference or label and the fix", async () => {
    expect(
      await issues(
        "![A](a.png){#fig-a}\n\n![B](b.png){#fig-a}\n\nText ![C](c.png){#fig-c} inline\n\n:ref{#fig-nope} :ref{#fig-c} :ref",
      ),
    ).toEqual([
      "xref: `#fig-a` labels more than one figure. Give each its own id.",
      "xref: the image `#fig-c` shares its paragraph with text, so it isn't numbered. Put it on a line of its own.",
      "`:ref` 1: nothing is labeled `#fig-nope`. Add `{#fig-nope}` to an image or a `::table`, or fix the id; labels start with `fig-` or `tbl-`.",
      "`:ref` 2: nothing is labeled `#fig-c`. Add `{#fig-c}` to an image or a `::table`, or fix the id; labels start with `fig-` or `tbl-`.",
      "`:ref` 3 names nothing. Write the id it points at, such as `:ref{#fig-login}`.",
    ]);
    expect(await render(":ref{#fig-nope}")).toBe("[fig-nope]");
  });

  it("names each issue's rule, and reports text a reference drops", async () => {
    const { meta } = await parseMarkdown(
      "Text ![C](c.png){#fig-c} inline\n\n:ref[the pond]{#fig-nope} :ref",
      { plugins: [xref()] },
    );
    expect(meta.issueRules).toEqual({
      "xref: the image `#fig-c` shares its paragraph with text, so it isn't numbered. Put it on a line of its own.":
        "comark/xref/inline-figure",
      "`:ref` 1: nothing is labeled `#fig-nope`. Add `{#fig-nope}` to an image or a `::table`, or fix the id; labels start with `fig-` or `tbl-`.":
        "comark/xref/unknown-label",
      '`:ref` 1 drops its text "the pond", since a reference reads as its label\'s number. Remove the brackets: `:ref{#fig-nope}`.':
        "comark/xref/ref-content",
      "`:ref` 2 names nothing. Write the id it points at, such as `:ref{#fig-login}`.":
        "comark/xref/missing-id",
    });
  });

  it("keeps the issues other plugins reported", async () => {
    const earlier = {
      name: "earlier",
      post(state: { tree: { meta: { issues?: string[] } } }) {
        state.tree.meta.issues = ["An earlier issue."];
      },
    };
    const { meta } = await parseMarkdown(":ref{#fig-x}", { plugins: [earlier, xref()] });
    expect(meta.issues[0]).toBe("An earlier issue.");
    expect(meta.issues).toHaveLength(2);
  });
});
