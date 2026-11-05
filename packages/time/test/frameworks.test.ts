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
import time from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown =
  "Opened :time[2026-11-02], due :time[2026-12-25], and :time[2026-11-04T11:59:56Z].";
// Drops what differs only in serialization: comments, whitespace between tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replaceAll("dateTime=", "datetime=")
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
};

describe("comark-time renderers", async () => {
  const value = await parseMarkdown(markdown, {
    plugins: [time({ now: "2026-11-04T12:00:00Z", timeZone: "UTC", locale: "en" })],
  });
  const html = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));
  const times = html.match(/<time .*?<\/time>/g) ?? [];

  it("renders a time with its tooltip in HTML", () => {
    expect(times).toHaveLength(3);
    expect(times[0]).toContain(">2 days ago<");
    expect(times[1]).toContain('data-mode="absolute"');
    expect(times[2]).toContain(">4 seconds ago<");
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      const out = normalize(await render(value));
      for (const part of times) expect(out).toContain(part);
    });

  it("ships Svelte components that compile", async () => {
    const source = await readFile(
      new URL("../src/svelte/RelativeTime.svelte", import.meta.url),
      "utf8",
    );
    expect(() =>
      compile(source, { filename: "RelativeTime.svelte", generate: "server" }),
    ).not.toThrow();
  });
});
