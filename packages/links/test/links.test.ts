import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import {
  anchors,
  components,
  external,
  type AnchorsOptions,
  type ExternalOptions,
} from "../src/html.ts";

const withoutStyles = (html: string) => html.replace(/<style[^>]*>.*?<\/style>/gs, "");
const renderExternal = async (markdown: string, options?: ExternalOptions) =>
  withoutStyles(await createHtmlRenderer({ plugins: [external(options)], components })(markdown));
const renderAnchors = async (markdown: string, options?: AnchorsOptions) =>
  withoutStyles(await createHtmlRenderer({ plugins: [anchors(options)], components })(markdown));
const warning =
  '<span class="cl-icon" aria-hidden="true">↗</span><span class="cl-sr">(opens in a new tab)</span>';

describe("external", () => {
  it("leaves every link alone by default", async () => {
    const out = await renderExternal("[Docs](https://example.com) and [home](/)");
    expect(out).toBe('<p><a href="https://example.com">Docs</a> and <a href="/">home</a></p>');
  });

  it("opens external links in a new tab with noopener and a warning", async () => {
    const out = await renderExternal("[Docs](https://example.com) and [home](/)", {
      target: "_blank",
    });
    expect(out).toContain(
      `<a href="https://example.com" target="_blank" rel="noopener">Docs${warning}</a>`,
    );
    expect(out).toContain('<a href="/">home</a>');
  });

  it("counts your own hosts as internal", async () => {
    const out = await renderExternal(
      "[Ours](https://example.com/a), [also](https://www.example.com) and [theirs](https://other.dev)",
      { target: "_blank", hosts: ["https://example.com/", "www.example.com"] },
    );
    expect(out).toContain('<a href="https://example.com/a">Ours</a>');
    expect(out).toContain('<a href="https://www.example.com">also</a>');
    expect(out).toContain('<a href="https://other.dev" target="_blank" rel="noopener">');
  });

  it("adds rel without a target, and no warning", async () => {
    const out = await renderExternal("[Docs](https://example.com)", { rel: ["nofollow"] });
    expect(out).toBe('<p><a href="https://example.com" rel="nofollow">Docs</a></p>');
  });

  it("keeps the author's own target and rel", async () => {
    const out = await renderExternal(
      '[Same](https://a.dev){target="_self"} [Own](https://b.dev){rel="me"} [New](https://c.dev){target="_blank"}',
      { target: "_blank", rel: ["nofollow"] },
    );
    expect(out).toContain('<a href="https://a.dev" target="_self" rel="nofollow">Same</a>');
    expect(out).toContain(
      `<a href="https://b.dev" rel="nofollow me noopener" target="_blank">Own${warning}</a>`,
    );
    expect(out).toContain('<a href="https://c.dev" target="_blank" rel="nofollow noopener">');
    // With the plugin's defaults, a link the author opens in a new tab still gets noopener and the warning.
    const own = await renderExternal('[New](https://c.dev){target="_blank"}');
    expect(own).toContain(
      `<a href="https://c.dev" target="_blank" rel="noopener">New${warning}</a>`,
    );
  });

  it("warns for internal links authored to open in a new tab", async () => {
    const out = await renderExternal('[Home](/){target="_blank"}', { hosts: ["example.com"] });
    expect(out).toContain(`<a href="/" target="_blank" rel="noopener">Home${warning}</a>`);
  });

  it("takes your own test, icon, and label", async () => {
    const out = await renderExternal("[A](https://a.dev) [B](/b)", {
      target: "_blank",
      test: (href) => href.startsWith("/"),
      icon: false,
      label: "(nueva pestaña)",
    });
    expect(out).toContain('<a href="https://a.dev">A</a>');
    expect(out).toContain(
      '<a href="/b" target="_blank" rel="noopener">B<span class="cl-sr">(nueva pestaña)</span></a>',
    );
  });

  it("leaves code alone and inlines the styles once", async () => {
    const markdown = "[A](https://a.dev) [B](https://b.dev)\n\n```md\n[C](https://c.dev)\n```";
    const out = await createHtmlRenderer({
      plugins: [external({ target: "_blank" })],
      components,
    })(markdown);
    expect(out.match(/<style data-comark-links>/g)).toHaveLength(1);
    expect(out.match(/class="cl-sr"/g)).toHaveLength(2);
    expect(out).not.toContain("links-styles");
  });
});

describe("anchors", () => {
  it("draws a link beside h2 to h4 after the heading, as Starlight does", async () => {
    const out = await renderAnchors("# Title\n\n## Setup\n\n### Install **now**\n\n##### Five");
    expect(out).toContain('<h1 id="title">Title</h1>');
    expect(out).toContain(
      '<div class="cl-heading"><h2 id="setup">Setup</h2><a class="cl-anchor" href="#setup"><span aria-hidden="true">#</span><span class="cl-sr">Section titled &quot;Setup&quot;</span></a></div>',
    );
    expect(out).toContain(
      '<h3 id="install-now">Install <strong>now</strong></h3><a class="cl-anchor" href="#install-now">',
    );
    expect(out).toContain('<h5 id="five">Five</h5>');
    expect(out).not.toContain("anchor=");
  });

  it("keeps the headings in the tree", async () => {
    const document = await parseMarkdown("## Setup {#custom}", { plugins: [anchors()] });
    expect(document.nodes).toEqual([
      ["h2", { id: "custom", anchor: { label: 'Section titled "Setup"', icon: "#" } }, "Setup"],
    ]);
  });

  it("takes your own levels, label, and icon", async () => {
    const out = await renderAnchors("# Title\n\n## Setup", {
      levels: [1],
      label: (text) => `Link to ${text}`,
      icon: "¶",
    });
    expect(out).toContain(
      '<a class="cl-anchor" href="#title"><span aria-hidden="true">¶</span><span class="cl-sr">Link to Title</span></a>',
    );
    expect(out).toContain('<h2 id="setup">Setup</h2>');
    expect(out).not.toContain('href="#setup"');
  });

  it("skips headings without an id", async () => {
    const out = withoutStyles(
      await createHtmlRenderer({ plugins: [anchors()], components, headingIds: false })("## Setup"),
    );
    expect(out).toBe("<h2>Setup</h2>");
  });
});
