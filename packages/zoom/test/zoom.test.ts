import { createHtmlRenderer } from "@comark/html";
import { describe, expect, expectTypeOf, it } from "vite-plus/test";
import type { ZoomDetail } from "../src/client.ts";
import zoom, { components } from "../src/html.ts";

const render = (markdown: string, options?: Parameters<typeof zoom>[0]) =>
  createHtmlRenderer({ plugins: [zoom(options)], components })(markdown);

describe("comark-zoom", () => {
  it("makes content images zoomable and adds the script once", async () => {
    const html = await render("![One](a.png)\n\n![Two](b.png)");
    expect(html).toContain('<img src="a.png" alt="One" data-zoom="" tabindex="0">');
    expect(html).toContain('<img src="b.png" alt="Two" data-zoom="" tabindex="0">');
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it("inlines styles a site can theme with --cz-* variables, with today's look as the fallback", async () => {
    const style = /<style data-comark-zoom>(.*?)<\/style>/s.exec(
      await render("![One](a.png)"),
    )?.[1];
    expect(style).toContain(
      "background:var(--cz-backdrop,color-mix(in srgb,var(--_comark-background) var(--cz-backdrop-opacity,96%),transparent))",
    );
    expect(style).toContain(".cz{margin:1.5rem 0}");
  });

  it("leaves linked images alone, and adds nothing when nothing zooms", async () => {
    const html = await render("[![Logo](logo.png)](https://example.com)");
    expect(html).toContain('<img src="logo.png" alt="Logo">');
    expect(html).not.toContain("<script>");
  });

  it("zooms the images in a block named carousel when comark-carousel doesn't draw it", async () => {
    const html = await render("::carousel\n1. A step\n\n   ![One](a.png)\n::");
    expect(html).toContain('<img src="a.png" alt="One" data-zoom="" tabindex="0">');
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it("can leave every image alone", async () => {
    const html = await render("![One](a.png)", { images: false });
    expect(html).not.toContain("data-zoom");
    expect(html).not.toContain("<script>");
  });

  it("zooms an image marked by hand when images are left alone", async () => {
    const html = await render("![One](a.png){data-zoom}", { images: false });
    expect(html).toContain('<img src="a.png" alt="One" data-zoom="" tabindex="0">');
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it("lets one image opt out with zoom=false or data-zoom=false", async () => {
    const html = await render(
      "![Logo](logo.png){zoom=false}\n\n![Icon](icon.png){data-zoom=false}",
    );
    expect(html).toContain('<img src="logo.png" alt="Logo">');
    expect(html).toContain('<img src="icon.png" alt="Icon">');
    expect(html).not.toContain("<script>");
  });

  it("wraps any block in ::zoom, with a group and a title", async () => {
    const html = await render('::zoom{group="tour" title="Step one"}\n> Any **content**\n::');
    expect(html).toMatch(
      /^<div class="cz" data-zoom tabindex="0" data-zoom-group="tour" data-zoom-title="Step one"><blockquote>/,
    );
    expect(html).toContain("<strong>content</strong>");
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it("keeps a ::zoom block's id and class, and no other attribute", async () => {
    const html = await render('::zoom{#step .wide foo="bar"}\nx\n::');
    expect(html).toMatch(/^<div class="cz wide" id="step" data-zoom tabindex="0">x<\/div>/);
  });

  it("escapes attributes and keeps the inline script closed", async () => {
    const html = await render('::zoom{title="</script><b>"}\nx\n::');
    expect(html).toContain('data-zoom-title="&lt;/script&gt;&lt;b&gt;"');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  it("types its events on the document and the window", () => {
    // Never called: tsc checks the listeners, and the tests have no DOM.
    const listen = () => {
      document.addEventListener("comark-zoom:open", (event) =>
        expectTypeOf(event.detail).toEqualTypeOf<ZoomDetail>(),
      );
      window.addEventListener("comark-zoom:close", (event) =>
        expectTypeOf(event.detail.item).toEqualTypeOf<HTMLElement>(),
      );
    };
    expectTypeOf(listen).toBeFunction();
  });
});
