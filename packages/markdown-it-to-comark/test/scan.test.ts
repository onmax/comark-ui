import { describe, expect, it } from "vite-plus/test";
import { scanSource, type Setup } from "../src/scan.ts";

const summary = (setups: Setup[]) =>
  setups.map((setup) => ({
    host: setup.host,
    line: setup.line,
    preset: setup.preset,
    options: setup.options,
    plugins: setup.plugins.map((plugin) => [plugin.name, plugin.mapping.kind, plugin.options]),
    rules: setup.rules.map((rule) => `${rule.method}(${rule.args})`),
    customized: setup.customized.map((item) => item.what),
    renders: setup.renders.map((render) => render.method),
  }));

describe("scanSource", () => {
  it.each([
    [
      "new MarkdownIt()",
      'import MarkdownIt from "markdown-it";\nconst md = new MarkdownIt({ html: true });',
    ],
    [
      "markdownit()",
      'import markdownit from "markdown-it";\nconst md = markdownit({ html: true });',
    ],
    [
      "require()",
      'const MarkdownIt = require("markdown-it");\nconst md = new MarkdownIt({ html: true });',
    ],
    ["require() called in place", 'const md = require("markdown-it")({ html: true });'],
  ])("finds an instance made with %s", (_, code) => {
    expect(summary(scanSource(code, "a.js"))).toMatchObject([
      { host: "markdown-it", options: { html: "true" } },
    ]);
  });

  it("reads the preset, options, plugins, rules, changes, and renders of an instance", () => {
    const code = [
      'import MarkdownIt from "markdown-it";',
      'import container from "markdown-it-container";',
      'import mine from "./mine";',
      'const md = new MarkdownIt("commonmark", { linkify: true }).use(container, "tip", { marker: "!" });',
      "md.use(mine).enable(['table']);",
      "md.set({ breaks: true });",
      "md.renderer.rules.fence = () => '';",
      "export const render = (s) => md.render(s);",
    ].join("\n");
    expect(summary(scanSource(code, "a.ts"))).toEqual([
      {
        host: "markdown-it",
        line: 4,
        preset: "commonmark",
        options: { linkify: "true", breaks: "true" },
        plugins: [
          ["markdown-it-container", "bridge", '"tip", { marker: "!" }'],
          ["./mine", "custom", undefined],
        ],
        rules: ["enable(['table'])"],
        customized: ["md.renderer.rules.fence"],
        renders: ["render"],
      },
    ]);
  });

  it.each([
    [
      "a VitePress config",
      ".vitepress/config.ts",
      'import footnote from "markdown-it-footnote";\nexport default { markdown: { config(md) { md.use(footnote) } } };',
      "vitepress",
    ],
    [
      "a VitePress config without a hook",
      "docs/.vitepress/config.mts",
      "export default { markdown: { lineNumbers: true } };",
      "vitepress",
    ],
    [
      "a VuePress config",
      ".vuepress/config.js",
      'module.exports = { extendMarkdown: (md) => { md.use(require("markdown-it-footnote")) } };',
      "vuepress",
    ],
    [
      "a Vite Markdown plugin",
      "vite.config.ts",
      'import Markdown from "unplugin-vue-markdown/vite";\nexport default { plugins: [Markdown({ markdownItSetup(md) { md.use(foot) } })] };',
      "vite",
    ],
    [
      "Eleventy's amendLibrary",
      "eleventy.config.js",
      'export default (config) => { config.amendLibrary("md", (md) => md.use(require("markdown-it-footnote"))) };',
      "eleventy",
    ],
    [
      "Eleventy's setLibrary",
      "eleventy.config.js",
      'import markdownIt from "markdown-it";\nexport default (config) => { config.setLibrary("md", markdownIt({ html: true })) };',
      "eleventy",
    ],
    [
      "a VS Code extension",
      "src/extension.ts",
      'import footnote from "markdown-it-footnote";\nexport function activate() { return { extendMarkdownIt(md) { return md.use(footnote) } } }',
      "vscode",
    ],
    [
      "a function that configures an instance it's given",
      "src/md.ts",
      'import footnote from "markdown-it-footnote";\nexport function setup(md) { md.use(footnote) }',
      "function",
    ],
  ])("reports %s as owned by its host", (_, file, code, host) => {
    expect(summary(scanSource(code, file)).map((setup) => setup.host)).toContain(host);
  });

  it("doesn't trust a constructor that shadows the import", () => {
    const [setup] = scanSource(
      'import MarkdownIt from "markdown-it";\nexport async function render(MarkdownIt, s) { const md = new MarkdownIt(); return md.render(s); }\n',
      "a.ts",
    );
    expect(setup?.unresolved).toMatch(/bound locally/);
  });

  it("reads VitePress options beside its hook", () => {
    const [setup] = scanSource(
      "export default { markdown: { html: false, linkify: false, config(md) { md.use(x) } } };",
      ".vitepress/config.ts",
    );
    expect(setup).toMatchObject({
      host: "vitepress",
      options: { html: "false", linkify: "false" },
    });
  });

  it("ignores a function whose parameter isn't given markdown-it plugins", () => {
    expect(scanSource("export function f(app) { app.use(router) }", "a.ts")).toEqual([]);
  });

  it("scans the scripts of a component", () => {
    const code =
      '<template><div v-html="html" /></template>\n<script setup>\nimport MarkdownIt from "markdown-it";\nconst md = new MarkdownIt();\nconst html = md.render(props.text);\n</script>\n';
    expect(summary(scanSource(code, "Note.vue"))).toMatchObject([
      { host: "markdown-it", line: 4, renders: ["render"] },
    ]);
  });
});
