import { readFile } from "node:fs/promises";
import { Writable } from "node:stream";
import type { UIMessage } from "ai";
import { createElement } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vite-plus/test";
import { Comment, createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { MessageParts as ReactParts } from "../src/react.ts";
import { MessageParts as VueParts } from "../src/vue.ts";

const parts: UIMessage["parts"] = [
  { type: "reasoning", text: "Check the *config*.", state: "done" },
  {
    type: "tool-read_file",
    toolCallId: "c1",
    state: "output-available",
    input: { path: "a.ts" },
    output: "ok",
  },
  { type: "tool-deploy", toolCallId: "c2", state: "input-streaming", input: undefined },
  { type: "text", text: "Done. See **a.ts**.", state: "done" },
  {
    type: "file",
    mediaType: "application/pdf",
    url: "https://example.com/r.pdf",
    filename: "r.pdf",
  },
];

async function react(element: ReturnType<typeof createElement>) {
  const { prelude } = await prerenderToNodeStream(element);
  let html = "";
  await new Promise<void>((resolve, reject) =>
    prelude
      .pipe(
        new Writable({
          write(chunk, _encoding, next) {
            html += String(chunk);
            next();
          },
        }),
      )
      .on("finish", resolve)
      .on("error", reject),
  );
  return html;
}

// Drops what differs only in serialization: comments, whitespace, React's Suspense markers, and empty attributes.
const normalize = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<template[^>]*><\/template>/g, "")
    .replace(/ (rel|target|download)="[^"]*"/g, "")
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<")
    .trim();

describe("comark-chat renderers", () => {
  it("renders the same message in Vue and React", async () => {
    const vue = normalize(
      await renderToString(createSSRApp({ render: () => h(VueParts, { parts }) })),
    );
    const html = normalize(await react(createElement(ReactParts, { parts })));
    expect(vue).toContain('<ul class="cht-trace">');
    expect(vue).toContain(
      '<li class="cht-step" data-kind="tool" data-status="running"><div class="cht-line">',
    );
    expect(vue).toContain("<strong>a.ts</strong>");
    expect(vue).toContain('<a class="cht-file" href="https://example.com/r.pdf">');
    for (const [name, markup] of [
      ["vue", vue],
      ["react", html],
    ])
      for (const piece of [
        "cht-trace",
        '<summary class="cht-line">',
        "deploy",
        "Running",
        "<strong>a.ts</strong>",
        "r.pdf",
      ])
        expect(markup, `${name}: ${piece}`).toContain(piece);
  });

  it("lets a slot or a render function replace a kind of part", async () => {
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          h(VueParts, { parts }, { tool: ({ title }: { title: string }) => h("b", title) }),
      }),
    );
    expect(vue).toContain("<b>read file</b>");
    const html = await react(
      createElement(ReactParts, {
        parts,
        render: { tool: ({ title }) => createElement("b", null, title), file: () => null },
      }),
    );
    expect(html).toContain("<b>read file</b>");
    expect(html).not.toContain("r.pdf");
  });

  it("keeps the default for a part that a Vue slot renders nothing for", async () => {
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          h(
            VueParts,
            { parts },
            {
              tool: ({ title }: { title: string }) =>
                title === "deploy" ? [h("b", title)] : [h(Comment)],
            },
          ),
      }),
    );
    expect(vue).toContain("<b>deploy</b>");
    expect(vue).toContain('<summary class="cht-line">');
  });

  it("renders text and reasoning with the app's own Markdown when it brings one", async () => {
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          h(VueParts, { parts }, { markdown: ({ value }: { value: string }) => h("q", value) }),
      }),
    );
    expect(vue).toContain("<q>Check the *config*.</q>");
    expect(vue).toContain("<q>Done. See **a.ts**.</q>");
    const html = await react(
      createElement(ReactParts, {
        parts,
        render: { markdown: ({ value }) => createElement("q", null, value) },
      }),
    );
    expect(html).toContain("<q>Done. See **a.ts**.</q>");
  });

  it("ships Svelte components that compile", async () => {
    for (const file of ["MessageParts", "MessageMarkdown", "Line"]) {
      const source = await readFile(
        new URL(`../src/svelte/${file}.svelte`, import.meta.url),
        "utf8",
      );
      expect(
        () => compile(source, { filename: `${file}.svelte`, generate: "server" }),
        file,
      ).not.toThrow();
    }
  });
});
