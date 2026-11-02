import { parseSync } from "oxc-parser";
import { describe, expect, it } from "vite-plus/test";
import { rewriteSource, scanSource } from "./support/index.ts";

const names = (source: string, file = "a.ts") =>
  scanSource(source, file).map((setup) => ({
    host: setup.host,
    plugins: setup.plugins.map((plugin) => `${plugin.name}:${plugin.mapping.kind}`),
    calls: setup.calls.map((call) => call.method),
  }));

describe("scanSource", () => {
  it("finds the shared marked, its options and extensions, and every call", () => {
    expect(
      names(`import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import markedAlert from "marked-alert";
marked.use(markedHighlight({ highlight: (code) => code }), markedAlert());
marked.setOptions({ breaks: true, pedantic: true, renderer: myRenderer });
export const a = (md) => marked.parse(md);
export const b = (md) => marked(md, { gfm: false });
export const c = (md) => marked.parseInline(md);`),
    ).toEqual([
      {
        host: "marked",
        plugins: [
          "marked-highlight:plugin",
          "marked-alert:plugin",
          "breaks:setup",
          "pedantic:unsupported",
          "renderer:custom",
          "gfm:setup",
        ],
        calls: ["parse", "parse", "parseInline"],
      },
    ]);
  });

  it("finds instances, CommonJS, and named exports", () => {
    expect(
      names(`const { Marked, parse } = require("marked");
const md = new Marked({ gfm: true }, require("marked-footnote")());
module.exports = (s) => md.parse(s) + parse(s);`),
    ).toEqual([
      { host: "marked", plugins: [], calls: ["parse"] },
      { host: "instance", plugins: ["gfm:setup", "marked-footnote:plugin"], calls: ["parse"] },
    ]);
  });

  it("reports options and extensions it can't follow", () => {
    const [setup] = scanSource(
      `import { marked } from "marked";\nmarked.use(...extensions);\nmarked.setOptions(options);\nmarked("x");`,
      "a.ts",
    );
    expect(setup?.unresolved).toContain("spreads a list of extensions");
    expect(setup?.plugins.every((plugin) => plugin.mapping.kind === "custom")).toBe(true);
  });

  it("reads component scripts", () => {
    expect(
      names(
        `<script setup lang="ts">\nimport { marked } from "marked";\nconst html = marked.parse(props.text);\n</script>\n<template><div v-html="html" /></template>`,
        "a.vue",
      ),
    ).toEqual([{ host: "marked", plugins: [], calls: ["parse"] }]);
  });

  it("ignores files that don't use marked", () => {
    expect(scanSource(`import { parse } from "other"; parse("x");`, "a.ts")).toEqual([]);
  });
});

const parses = (code: string, file = "a.ts") => parseSync(file, code).errors.length === 0;

describe("rewriteSource", () => {
  it("awaits renderHtml where the function is async, and carries options and extensions over", () => {
    const source = `import { marked } from "marked";
import markedAlert from "marked-alert";
marked.use(markedAlert(), { breaks: true });
export async function render(md: string) {
  return marked.parse(md).trim();
}
`;
    const { code, rewrites } = rewriteSource(source, "a.ts");
    expect(rewrites).toEqual([{ file: "a.ts", line: 5, rewritten: true }]);
    expect(code).toBe(`import alert from "comark/plugins/alert";
import { renderHtml } from "@comark/html";
import { comarkOptions } from "marked-to-comark/setup";
export async function render(md: string) {
  return (await renderHtml(md, comarkOptions({ breaks: true, plugins: [alert()] }))).trim();
}
`);
    expect(parses(code)).toBe(true);
    expect(rewriteSource(code, "a.ts").code).toBe(code);
  });

  it("returns the promise where marked was already async", () => {
    const { code } = rewriteSource(
      `import { Marked } from "marked";\nconst md = new Marked({ async: true });\nexport const render = (s: string) => md.parse(s);\n`,
      "a.ts",
    );
    expect(code).toContain("export const render = (s: string) => renderHtml(s, comarkOptions());");
    expect(code).not.toContain("new Marked");
    expect(code).not.toMatch(/from "marked"/);
  });

  it("gives headings ids for marked before v8, unless the setup turned them off", () => {
    const source = `import { marked } from "marked";\nexport const a = async (s: string) => marked(s);\n`;
    expect(rewriteSource(source, "a.ts", { version: "^4.2.0" }).code).toContain(
      "comarkOptions({ headerIds: true })",
    );
    expect(rewriteSource(source, "a.ts", { version: "^12.0.0" }).code).toContain("comarkOptions()");
    expect(
      rewriteSource(source.replace("marked(s)", "marked(s, { headerIds: false })"), "a.ts", {
        version: "^4.2.0",
      }).code,
    ).toContain("comarkOptions()");
  });

  it.each([
    ["a sync function", `export function a(s: string) { return marked.parse(s); }`, "isn't async"],
    ["the module top", `export const a = marked.parse("x");`, "top of the module"],
    [
      "parseInline",
      `export async function a(s: string) { return marked.parseInline(s); }`,
      "parseInline",
    ],
    [
      "a renderer",
      `marked.use({ renderer: { link() { return ""; } } });\nexport async function a(s: string) { return marked.parse(s); }`,
      "own code",
    ],
    [
      "pedantic",
      `marked.setOptions({ pedantic: true });\nexport async function a(s: string) { return marked.parse(s); }`,
      "no Comark counterpart",
    ],
    [
      "extension options",
      `import { markedHighlight } from "marked-highlight";\nmarked.use(markedHighlight({ highlight: (c) => c }));\nexport async function a(s: string) { return marked.parse(s); }`,
      "doesn't take",
    ],
  ])("leaves a call in %s", (_, body, reason) => {
    const source = `import { marked } from "marked";\n${body}\n`;
    const result = rewriteSource(source, "a.ts");
    expect(result.code).toBe(source);
    expect(result.rewrites[0]?.reason).toContain(reason);
  });

  it("leaves the shared marked when other files configure or call it", () => {
    const source = `import { marked } from "marked";\nexport async function a(s: string) { return marked.parse(s); }\n`;
    const result = rewriteSource(source, "a.ts", { shared: ["setup.ts"] });
    expect(result.code).toBe(source);
    expect(result.rewrites[0]?.reason).toContain("setup.ts");
  });

  it("leaves CommonJS", () => {
    const source = `const { marked } = require("marked");\nexports.a = async (s) => marked(s);\n`;
    expect(rewriteSource(source, "a.js").rewrites[0]?.reason).toContain("CommonJS");
  });

  it("keeps the marked import while other code still uses it", () => {
    const source = `import { marked } from "marked";\nexport async function a(s: string) { return marked.parse(s); }\nexport function b(s: string) { return marked.parse(s); }\n`;
    const { code } = rewriteSource(source, "a.ts");
    expect(code).toContain(`import { marked } from "marked";`);
    expect(code).toContain("return await renderHtml(s, comarkOptions());");
    expect(code).toContain("return marked.parse(s);");
  });

  it("rewrites a Svelte component's script", () => {
    const source = `<script>\n  import { marked } from "marked";\n  export let text;\n  let html = "";\n  async function load() { html = marked(text); }\n</script>\n{@html html}\n`;
    const { code } = rewriteSource(source, "a.svelte");
    expect(code).toContain("html = await renderHtml(text, comarkOptions());");
    expect(code).not.toContain(`from "marked"`);
  });
});
