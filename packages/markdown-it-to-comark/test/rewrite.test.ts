import { describe, expect, it } from "vite-plus/test";
import { rewriteSource } from "../src/rewrite.ts";

const rewrite = (code: string, file = "render.ts") => rewriteSource(code, file);

describe("rewriteSource", () => {
  it("replaces an instance that only renders in async code, keeping its options and plugins", () => {
    const result = rewrite(
      [
        'import MarkdownIt from "markdown-it";',
        'import footnote from "markdown-it-footnote";',
        'import container from "markdown-it-container";',
        "",
        "const md = new MarkdownIt({ html: true, linkify: true }).use(footnote);",
        'md.use(container, "tip");',
        "",
        "export async function render(source: string) {",
        "  return md.render(source);",
        "}",
        "",
      ].join("\n"),
    );
    expect(result.rewrites).toEqual([{ file: "render.ts", line: 5, rewritten: true }]);
    expect(result.code).toBe(
      [
        'import footnote from "markdown-it-footnote";',
        'import container from "markdown-it-container";',
        'import { renderHtml } from "@comark/html";',
        'import { comarkOptions } from "markdown-it-to-comark/setup";',
        'import { markdownItPlugin } from "markdown-it-to-comark/plugins";',
        "",
        'const md = comarkOptions({ html: true, linkify: true, plugins: [markdownItPlugin(footnote), markdownItPlugin(container, "tip")] });',
        "",
        "export async function render(source: string) {",
        "  return (await renderHtml(source, md));",
        "}",
        "",
      ].join("\n"),
    );
    expect(rewriteSource(result.code, "render.ts").code).toBe(result.code);
  });

  it("replaces a one-off render, and keeps the preset and rules", () => {
    const result = rewrite(
      'import markdownit from "markdown-it";\nexport const html = async (s: string) => markdownit("zero").enable(["emphasis"]).render(s);\n',
    );
    expect(result.code).toBe(
      'import { renderHtml } from "@comark/html";\nimport { comarkOptions } from "markdown-it-to-comark/setup";\nexport const html = async (s: string) => (await renderHtml(s, comarkOptions({ preset: "zero", enable: ["emphasis"] })));\n',
    );
  });

  it.each([
    [
      "renders outside an async function",
      "const md = new MarkdownIt();\nexport const render = (s: string) => md.render(s);",
      /outside an async function/,
    ],
    [
      "is exported",
      "export const md = new MarkdownIt();\nexport const render = async (s: string) => md.render(s);",
      /leaves this file/,
    ],
    [
      "is passed on",
      "const md = new MarkdownIt();\nsetup(md);\nexport const render = async (s: string) => md.render(s);",
      /leaves this file/,
    ],
    [
      "changes a renderer rule",
      "const md = new MarkdownIt();\nmd.renderer.rules.fence = () => '';\nexport const render = async (s: string) => md.render(s);",
      /by hand/,
    ],
    [
      "renders inline",
      "const md = new MarkdownIt();\nexport const render = async (s: string) => md.renderInline(s);",
      /renderInline/,
    ],
    [
      "passes an env",
      "const md = new MarkdownIt();\nexport const render = async (s: string) => md.render(s, {});",
      /env/,
    ],
    [
      "takes a highlight function",
      "const md = new MarkdownIt({ highlight });\nexport const render = async (s: string) => md.render(s);",
      /highlight/,
    ],
    [
      "takes options in a variable",
      "const md = new MarkdownIt(options);\nexport const render = async (s: string) => md.render(s);",
      /options/,
    ],
    [
      "uses the project's own plugin",
      'import mine from "./mine.js";\nconst md = new MarkdownIt().use(mine);\nexport const render = async (s: string) => md.render(s);',
      /compared/,
    ],
  ])("leaves an instance that %s, with the reason", (_, body, reason) => {
    const code = `import MarkdownIt from "markdown-it";\n${body}\n`;
    const result = rewrite(code);
    expect(result.code).toBe(code);
    expect(result.rewrites[0]?.rewritten).toBe(false);
    expect(result.rewrites[0]?.reason).toMatch(reason);
  });

  it("leaves CommonJS alone", () => {
    const code =
      'const MarkdownIt = require("markdown-it");\nconst md = new MarkdownIt();\nexports.render = async (s) => md.render(s);\n';
    expect(rewrite(code, "render.cjs").rewrites[0]?.reason).toMatch(/CommonJS/);
  });

  it("drops a type annotation that names the instance", () => {
    const result = rewrite(
      'import MarkdownIt from "markdown-it";\nconst md: MarkdownIt = new MarkdownIt();\nexport const render = async (s: string) => md.render(s);\n',
    );
    expect(result.code).toContain("const md = comarkOptions();");
    expect(result.code).not.toContain('from "markdown-it"');
  });

  it("rewrites the script of a component", () => {
    const result = rewrite(
      '<script setup lang="ts">\nimport MarkdownIt from "markdown-it";\nconst md = new MarkdownIt();\nconst html = await md.render(props.text);\n</script>\n<template><div v-html="html" /></template>\n',
      "Note.vue",
    );
    expect(result.rewrites[0]?.reason).toMatch(/outside an async function/);
  });
});
