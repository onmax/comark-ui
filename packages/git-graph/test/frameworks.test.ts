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
import gitGraph from "../src/index.ts";
import { components as htmlComponents } from "../src/html.ts";
import { components as reactComponents } from "../src/react.ts";
import { components as vueComponents } from "../src/vue.ts";

const stack = await readFile(new URL("fixtures/stack.txt", import.meta.url), "utf8");
const markdown = `::git-graph{title="Ducks & geese"}\n\`\`\`\n${stack.trimEnd()}\n\`\`\`\n#commit-8bb4fd2\n**Approved**, see [the review](https://example.com/r/1)\n#footer\nMerge the stack from the bottom.\n::`;
const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Bundles @comark/svelte with the package's components, so both share Svelte's internals, and renders on the server.
async function renderSvelte(value: MarkdownDocument) {
  const result = await build({
    configFile: false,
    logLevel: "error",
    resolve: {
      alias: {
        "comark-git-graph/client": source("../src/client.ts"),
        "comark-git-graph": source("../src/index.ts"),
      },
      conditions: ["svelte"],
    },
    ssr: { noExternal: true, resolve: { conditions: ["svelte"] } },
    plugins: [
      {
        name: "git-graph-test-svelte",
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
  const dir = await mkdtemp(join(tmpdir(), "comark-git-graph-svelte-"));
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
// Drops what differs only in serialization: comments, line breaks between tags, empty attributes, and the HTML
// renderer's inline styles.
const normalize = (html: string) =>
  html
    .replace(/ (data-[a-z-]+)=""/g, " $1")
    .replace(/<!--.*?-->/g, "")
    .replace(/<style[^>]*>.*?<\/style>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s*\n\s*/g, "")
    .trim();
const renderers = {
  vue: (value: MarkdownDocument) =>
    renderVue(createSSRApp({ render: () => h(VueDocument, { value, components: vueComponents }) })),
  react: (value: MarkdownDocument) =>
    renderReact(createElement(ReactDocument, { value, components: reactComponents })),
  svelte: renderSvelte,
};

describe("comark-git-graph renderers", async () => {
  const value = await parseMarkdown(markdown, { plugins: [gitGraph()] });
  const expected = normalize(await renderHtmlFromDocument(value, { components: htmlComponents }));

  it("renders the frame, the lines, the rows, a commit's note, and the footer in HTML", () => {
    expect(expected).toContain(
      '<figure class="cgg" data-comark-frame data-not-typeset aria-label="Ducks & geese"><div class="cgg-head">',
    );
    expect(expected).toContain('<div class="cgg-lines"><svg viewBox="0 0 46 ');
    expect(expected).toContain(
      '<span class="cgg-sha">8bb4fd2</span></div><div class="cgg-note"><strong>Approved</strong>, see <a href="https://example.com/r/1">the review</a></div>',
    );
    expect(expected).toContain('<div class="cgg-footer">Merge the stack from the bottom.</div>');
  });

  for (const [name, render] of Object.entries(renderers))
    it(`renders the same markup in ${name}`, async () => {
      expect(normalize(await render(value))).toContain(expected);
    });

  for (const file of ["GitGraph.svelte", "GitGraphLines.svelte"])
    it(`ships ${file}, which compiles`, async () => {
      const source = await readFile(new URL(`../src/svelte/${file}`, import.meta.url), "utf8");
      expect(() => compile(source, { filename: file, generate: "server" })).not.toThrow();
    });
});
