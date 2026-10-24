import { createHtmlRenderer } from "@comark/html";
import { createMarkdownParser, parseMarkdown, type ComarkPlugin, type ParserOptions } from "comark";
import { describe, expect, it } from "vite-plus/test";
import zoom from "../../zoom/src/index.ts";
import { html } from "../../github/src/raw-html.ts";
import figure, { type FigureOptions } from "../src/index.ts";

// The renderer indents blocks; the tests compare the markup alone.
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const render = async (
  markdown: string,
  options: FigureOptions = {},
  parser: ParserOptions = {},
  plugins: ComarkPlugin[] = [figure(options)],
) => flat(await createHtmlRenderer({ ...parser, plugins })(markdown));
const captioned = (caption: string, image = '<img src="duck.png" alt="A duck">') =>
  `<figure>${image}<figcaption>${caption}</figcaption></figure>`;

describe("comark-figure", () => {
  it("captions an image alone in its paragraph with its title, and keeps the alt text", async () => {
    expect(await render('![A duck](duck.png "The office duck, on call")')).toBe(
      captioned("The office duck, on call"),
    );
  });

  it("leaves an image with no title, or in a sentence, as it was", async () => {
    expect(await render("![A duck](duck.png)")).toBe('<p><img src="duck.png" alt="A duck"></p>');
    expect(await render('Meet ![A duck](duck.png "Duck")')).toBe(
      '<p>Meet <img src="duck.png" title="Duck" alt="A duck"></p>',
    );
    expect(await render('![A duck](duck.png "Duck")\nOn call.')).toBe(
      '<p><img src="duck.png" title="Duck" alt="A duck">\nOn call.</p>'.replace("\n", ""),
    );
  });

  it("captions a linked image and keeps the link around the image only", async () => {
    expect(await render('[![A duck](duck.png "Duck")](https://duck.dev)')).toBe(
      captioned("Duck", '<a href="https://duck.dev"><img src="duck.png" alt="A duck"></a>'),
    );
  });

  it("captions images in lists, quotes, and components, where Comark drops the paragraph", async () => {
    expect(await render('- ![A duck](duck.png "Duck")')).toBe(
      `<ul><li>${captioned("Duck")}</li></ul>`,
    );
    expect(await render('> ![A duck](duck.png "Duck")')).toBe(
      `<blockquote>${captioned("Duck")}</blockquote>`,
    );
    expect(await render('::note\n![A duck](duck.png "Duck")\n\nOn call.\n::')).toBe(
      `<note>${captioned("Duck")}<p>On call.</p></note>`,
    );
  });

  it("keeps attributes on the image", async () => {
    expect(await render('![A duck](duck.png "Duck"){width=300}')).toBe(
      captioned("Duck", '<img src="duck.png" alt="A duck" width="300">'),
    );
  });

  it("lifts every image alone in its paragraph out of the p with unwrap", async () => {
    expect(await render("![A duck](duck.png)\n\nText ![B](b.png)", { unwrap: true })).toBe(
      '<img src="duck.png" alt="A duck"><p>Text <img src="b.png" alt="B"></p>',
    );
    expect(await render('![A duck](duck.png "Duck")', { unwrap: true })).toBe(captioned("Duck"));
  });

  it("works with comark-zoom in either order, and the image still zooms", async () => {
    const zoomed = captioned("Duck", '<img src="duck.png" alt="A duck" data-zoom="" tabindex="0">');
    for (const plugins of [
      [figure(), zoom()],
      [zoom(), figure()],
    ])
      expect(await render('![A duck](duck.png "Duck")', {}, {}, plugins)).toBe(
        `${zoomed}<zoom-runtime></zoom-runtime>`,
      );
  });

  it("works without Comark's default plugins, and while streaming", async () => {
    expect(await render('![A duck](duck.png "Duck")', {}, { registerDefaultPlugins: false })).toBe(
      captioned("Duck"),
    );
    const parse = createMarkdownParser({ plugins: [figure()] });
    const partial = await parse('![A duck](duck.png "Du', { streaming: true });
    expect(JSON.stringify(partial.nodes)).not.toContain("figure");
    const done = await parse('![A duck](duck.png "Duck")', { streaming: true });
    expect(done.nodes).toMatchObject([
      ["figure", {}, ["img", { src: "duck.png", alt: "A duck" }], ["figcaption", {}, "Duck"]],
    ]);
  });

  it("closes what a stream leaves open in the paragraphs around a figure", async () => {
    expect(await render('![A duck](duck.png "Duck")\n\nOn **call')).toBe(
      `${captioned("Duck")}<p>On <strong>call</strong></p>`,
    );
  });

  it("keeps the AST to plain figure, img, and figcaption nodes", async () => {
    const { nodes, meta } = await parseMarkdown('![A duck](duck.png "Duck")', {
      plugins: [figure()],
    });
    expect(nodes).toEqual([
      ["figure", {}, ["img", { src: "duck.png", alt: "A duck" }], ["figcaption", {}, "Duck"]],
    ]);
    expect(meta.issues).toBeUndefined();
  });

  it("leaves raw HTML images and their subtrees unchanged", async () => {
    expect(
      await render('<p><img src="duck.png" title="Raw caption"></p>', {}, {}, [html(), figure()]),
    ).toBe('<p><img src="duck.png" title="Raw caption"></p>');
  });
});
