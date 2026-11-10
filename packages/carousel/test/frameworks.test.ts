import { readFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { type MarkdownDocument, parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import carousel from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const parse = () =>
  parseMarkdown('::carousel{title="Tour"}\nOne **bold**\n\nTwo\n::', { plugins: [carousel()] });
const expectCarousel = (html: string) => {
  expect(html).toMatch(
    /<div class="cc"( data-comark-mounts(="")?)? data-comark-frame(="")? data-zoom-gallery(="")? role="region" aria-roledescription="carousel" aria-label="Tour">/,
  );
  expect(html.match(/class="cc-slide"/g)).toHaveLength(2);
  expect(html).toMatch(/aria-label="2 of 2" data-zoom(="")? tabindex="0" data-zoom-title="Tour"/);
  expect(html).toMatch(/<span class="cc-count" aria-live="polite">1 \/ (<!-- -->)?2<\/span>/);
  expect(html.match(/class="cc-step"/g)).toHaveLength(2);
  expect(html).toContain("<strong>bold</strong>");
};
const renderers = {
  html: (value: MarkdownDocument) => renderHtmlFromDocument(value, { components: htmlComponents }),
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-carousel renderers", () => {
  it("renders the same carousel in Vue", async () => {
    expectCarousel(await renderers.vue(await parse()));
  });

  it("renders the same carousel in React", async () => {
    expectCarousel(renderers.react(await parse()));
  });

  it("reads bound props, drops {#id .class}, and renders a stray slide plain in every renderer", async () => {
    const value = await parseMarkdown(
      ':::slide\nLost\n:::\n\n::carousel{:zoom="false" :columns="2" #tour .wide}\nOne\n\nTwo\n\nThree\n::',
      { plugins: [carousel()] },
    );
    for (const [name, render] of Object.entries(renderers)) {
      // Up to the HTML renderer's inline styles and script, whose source mentions attributes of its own.
      const [html = ""] = (await render(value)).split("<style");
      expect(html, name).toMatch(
        /<div class="cc"( data-comark-mounts(="")?)? data-comark-frame(="")? data-carousel-columns="2" role="region" aria-roledescription="carousel" aria-label="Carousel">/,
      );
      expect(html, name).toContain(
        '<div class="cc-slide" role="group" aria-roledescription="slide" aria-label="3 of 3">',
      );
      expect(html, name).toContain('aria-label="Previous slide" aria-disabled="true"');
      expect(html, name).toMatch(/<div>\s*Lost\s*<\/div>/);
      expect(html, name).not.toMatch(/tour|wide|data-zoom|undefined/);
    }
  });

  it("ships Svelte components that compile", async () => {
    for (const name of ["Carousel", "Slide"]) {
      const source = await readFile(
        new URL(`../src/svelte/${name}.svelte`, import.meta.url),
        "utf8",
      );
      expect(() =>
        compile(source, { filename: `${name}.svelte`, generate: "server" }),
      ).not.toThrow();
    }
  });
});
