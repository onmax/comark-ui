import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderHtmlFromDocument } from "@comark/html";
import { MarkdownDocument as ReactDocument } from "@comark/react";
import { MarkdownDocument as VueDocument } from "@comark/vue";
import { type MarkdownDocument, parseMarkdown } from "comark";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { build } from "vite";
import { renderToString as renderVue } from "vue/server-renderer";
import social from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const markdown = [
  '::post{url="https://bsky.app/profile/ada.bsky.social/post/3lxyz" author="Ada & co" handle="ada.bsky.social" time="2026-11-20T09:30:00Z" replies="3" reposts="1.2K" likes="40"}',
  "Shipped the parser, thanks @grace.bsky.social #parsers",
  "",
  "![Chart](https://example.com/chart.png)",
  "",
  ':::post{author="Grace" handle="grace.bsky.social"}',
  "The original",
  ":::",
  "::",
  "",
  "::thread",
  ':::post{url="https://x.com/ada/status/1" author="Ada" handle="ada" time="2026-11-20T09:30:00Z"}',
  "First",
  ":::",
  "",
  ':::post{url="https://x.com/ada/status/2" author="Ada" handle="ada" time="2026-11-20T09:31:00Z" views="12"}',
  "Second",
  ":::",
  "::",
].join("\n");
const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Bundles @comark/svelte with the package's components, so both share Svelte's internals, and renders on the server.
async function renderSvelte(value: MarkdownDocument) {
  const result = await build({
    configFile: false,
    logLevel: "error",
    resolve: {
      alias: {
        "comark-social/client": source("../src/client.ts"),
        "comark-social": source("../src/index.ts"),
      },
      conditions: ["svelte"],
    },
    ssr: { noExternal: true, resolve: { conditions: ["svelte"] } },
    plugins: [
      {
        name: "social-test-svelte",
        transform(code, id) {
          if (id.endsWith(".svelte")) return compile(code, { filename: id, generate: "server" }).js;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      ssr: source("fixtures/svelte-server.ts"),
      rollupOptions: { output: { format: "es" } },
    },
  });
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  const dir = await mkdtemp(join(tmpdir(), "comark-social-svelte-"));
  try {
    const file = join(dir, "render.mjs");
    await writeFile(file, output.output.find((chunk) => chunk.type === "chunk")!.code!);
    const { render } = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as {
      render: (document: MarkdownDocument) => string;
    };
    return render(value);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
// Drops what differs only in serialization: comments, line breaks between tags, empty attributes, self-closing
// tags, and the HTML renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/ (data-[a-z-]+)=""/g, " $1")
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s*\/>/g, ">")
    .replace(/\s*\n\s*/g, "")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
  svelte: renderSvelte,
};

describe("comark-social renderers", async () => {
  const value = await parseMarkdown(markdown, {
    plugins: [social({ now: "2026-11-28T12:00:00Z", timeZone: "UTC" })],
  });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the card, its quoted post, and the counts in HTML", () => {
    expect(expected).toContain(
      '<article class="csl" data-platform="bluesky" data-comark-frame data-not-typeset aria-label="Post by Ada & co on Bluesky">',
    );
    expect(expected).toContain(
      '<article class="csl" data-platform="bluesky" data-quote aria-label="Post by Grace on Bluesky">',
    );
    expect(expected).toContain('<span class="csl-sr">1,200 reposts</span>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  it("ships Post.svelte, which compiles", async () => {
    const file = await readFile(new URL("../src/svelte/Post.svelte", import.meta.url), "utf8");
    expect(() => compile(file, { filename: "Post.svelte", generate: "server" })).not.toThrow();
  });
});
