import { describe, expect, it } from "vite-plus/test";
import { rewriteSource, scanSource } from "./support/index.ts";

const names = (source: string, file = "x.ts") =>
  scanSource(source, file).map((setup) => [
    setup.host,
    setup.plugins.map((plugin) => `${plugin.name}:${plugin.mapping.kind}`),
  ]);

describe("scanSource", () => {
  it.each([
    "getPlugins()",
    "enabled ? [gfm] : []",
    "config.remarkPlugins",
    "plugins",
    "[...getPlugins()]",
    "[enabled && gfm]",
    "[enabled ? gfm : other]",
    "[getPlugin()]",
    "[[getPlugin(), {}]]",
    "[[gfm, enabled ? {} : false]]",
  ])("preserves an unresolved ReactMarkdown plugin list: %s", (expression) => {
    const [setup] = scanSource(
      `import Markdown from "react-markdown"; import gfm from "remark-gfm"; export const C = () => <Markdown remarkPlugins={${expression}} />;`,
      "view.tsx",
    );
    expect(setup?.host).toBe("react-markdown");
    expect(setup?.unresolved).toContain("can't be statically enumerated");
  });

  it.each([
    "const plugins = []; plugins.push(gfm);",
    "const plugins = []; plugins[0] = gfm;",
    "let plugins = [gfm]; plugins = [];",
    "const plugins = [gfm]; const alias = plugins; alias.length = 0;",
    "const plugins = [[gfm, {}]]; const copy = [...plugins]; copy[0][0] = other;",
    "const plugins = []; configure(plugins);",
    "export const plugins = [gfm];",
    "function other() { const plugins = [gfm]; }",
    "const plugins = [gfm]; function other(plugins) {}",
  ])("leaves unproven local plugin-array bindings unresolved: %s", (declaration) => {
    const [setup] = scanSource(
      `import Markdown from "react-markdown"; import gfm from "remark-gfm"; import other from "remark-math"; ${declaration} export const C = () => <Markdown remarkPlugins={plugins} />;`,
      "view.tsx",
    );
    expect(setup?.unresolved).toContain("can't be statically enumerated");
  });

  it("keeps statically enumerated JSX lists resolved", () => {
    const setups = scanSource(
      `import Markdown from "react-markdown"; import gfm from "remark-gfm"; const base = [gfm]; const plugins = [...base]; export const C = () => <><Markdown /><Markdown remarkPlugins={[]} /><Markdown remarkPlugins={[...plugins]} /><Markdown remarkPlugins={[[gfm, { singleTilde: true }]]} /></>;`,
      "view.tsx",
    );
    expect(setups).toHaveLength(4);
    expect(setups.every((setup) => !setup.unresolved)).toBe(true);
    expect(setups.map((setup) => setup.plugins.map((plugin) => plugin.name))).toEqual([
      [],
      [],
      ["remark-gfm"],
      ["remark-gfm"],
    ]);
  });

  it("leaves a shadowed plugin import unresolved", () => {
    const [setup] = scanSource(
      `import Markdown from "react-markdown"; import gfm from "remark-gfm"; export const C = (gfm) => <Markdown remarkPlugins={[gfm]} />;`,
      "view.tsx",
    );
    expect(setup?.unresolved).toContain("can't be statically enumerated");
  });

  it("reads a unified chain and maps each plugin", () => {
    const source = `import { unified } from "unified";\nimport remarkParse from "remark-parse";\nimport remarkGfm from "remark-gfm";\nimport remarkRehype from "remark-rehype";\nimport rehypeSlug from "rehype-slug";\nimport rehypeStringify from "rehype-stringify";\nexport const html = (md: string) => unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeSlug).use(rehypeStringify).process(md);\n`;
    expect(names(source)).toEqual([
      [
        "unified",
        [
          "remark-parse:pipeline",
          "remark-gfm:setup",
          "remark-rehype:pipeline",
          "rehype-slug:port",
          "rehype-stringify:pipeline",
        ],
      ],
    ]);
  });

  it("reads framework plugin lists in every form they're written", () => {
    const source = `import remarkMath from "remark-math";\nimport mine from "./lib/remark-mine.js";\nconst local = () => () => {};\nexport default { markdown: { remarkPlugins: [remarkMath, [mine, { a: 1 }], local], rehypePlugins: [[(await import("rehype-katex")).default, {}], require("rehype-slug")] } };\n`;
    expect(names(source, "astro.config.mjs")).toEqual([
      ["astro", ["remark-math:plugin", "./lib/remark-mine.js:custom", "local:custom"]],
      ["astro", ["rehype-katex:plugin", "rehype-slug:port"]],
    ]);
  });

  it("reads gatsby-transformer-remark's plugins", () => {
    const source =
      "module.exports = { plugins: [{ resolve: `gatsby-transformer-remark`, options: { plugins: [`gatsby-remark-prismjs`, { resolve: `gatsby-remark-images`, options: { maxWidth: 590 } }] } }] };\n";
    expect(names(source, "gatsby-config.js")).toEqual([
      ["gatsby", ["gatsby-remark-prismjs:plugin", "gatsby-remark-images:unsupported"]],
    ]);
  });
});

describe("rewriteSource", () => {
  it("replaces a chain that renders HTML with renderHtml and fixes the imports", () => {
    const source = `import { remark } from "remark";\nimport html from "remark-html";\nimport remarkMath from "remark-math";\n\nexport async function toHtml(markdown: string) {\n  const result = await remark().use(remarkMath).use(html).process(markdown);\n  return result.toString();\n}\n`;
    const { code, rewrites } = rewriteSource(source, "a.ts");
    expect(rewrites).toEqual([{ file: "a.ts", line: 6, rewritten: true }]);
    expect(code).toBe(
      `import math, { Math } from "@comark/html/plugins/math";\nimport { renderHtml } from "@comark/html";\nimport { comarkOptions } from "remark-to-comark/setup";\n\nexport async function toHtml(markdown: string) {\n  const result = await renderHtml(markdown, { ...comarkOptions({ plugins: [math()], html: false, gfm: false, frontmatter: false }), components: { Math } });\n  return result.toString();\n}\n`,
    );
  });

  it("rewrites a chain inside a Vue component's script and points at the component's lines", () => {
    const source = `<template>\n  <div v-html="body" />\n</template>\n\n<script setup lang="ts">\nimport { remark } from "remark";\nimport remarkHtml from "remark-html";\nconst props = defineProps<{ markdown: string }>();\nconst body = String(await remark().use(remarkHtml).process(props.markdown));\n</script>\n`;
    const { code, rewrites } = rewriteSource(source, "Doc.vue");
    expect(rewrites).toEqual([{ file: "Doc.vue", line: 9, rewritten: true }]);
    expect(
      code.startsWith(
        `<template>\n  <div v-html="body" />\n</template>\n\n<script setup lang="ts">\nimport { renderHtml } from "@comark/html";`,
      ),
    ).toBe(true);
    expect(code).toContain(
      `const body = String(await renderHtml(props.markdown, comarkOptions({ html: false, gfm: false, frontmatter: false })));\n</script>\n`,
    );
    expect(scanSource(source, "Doc.vue")[0]).toMatchObject({
      file: "Doc.vue",
      line: 9,
      plugins: [{ line: 9 }, { line: 9 }],
    });
  });

  it("reads an Astro component's frontmatter script", () => {
    const source = `---\nimport { unified } from "unified";\nimport remarkParse from "remark-parse";\nimport remarkRehype from "remark-rehype";\nimport rehypeStringify from "rehype-stringify";\nconst html = String(await unified().use(remarkParse).use(remarkRehype).use(rehypeStringify).process(Astro.props.body));\n---\n<article set:html={html} />\n`;
    expect(rewriteSource(source, "Post.astro").rewrites).toEqual([
      { file: "Post.astro", line: 6, rewritten: true },
    ]);
  });

  it("leaves a chain with a plugin Comark can't replace, and says which", () => {
    const source = `import { unified } from "unified";\nimport remarkParse from "remark-parse";\nimport mine from "./mine.js";\nimport rehypeStringify from "rehype-stringify";\nunified().use(remarkParse).use(mine).use(rehypeStringify).process("x");\n`;
    const { code, rewrites } = rewriteSource(source, "b.ts");
    expect(code).toBe(source);
    expect(rewrites[0]).toMatchObject({
      rewritten: false,
      reason: "uses the project's own plugin (./mine.js)",
    });
  });

  it("keeps an import something else still uses", () => {
    const source = `import { unified } from "unified";\nimport remarkParse from "remark-parse";\nimport rehypeStringify from "rehype-stringify";\nexport const p = unified().use(remarkParse);\nexport const run = async (md: string) => String(await unified().use(remarkParse).use(rehypeStringify).process(md));\n`;
    const { code } = rewriteSource(source, "c.ts");
    expect(code).toContain(`import remarkParse from "remark-parse";`);
    expect(code).toContain(`import { unified } from "unified";`);
    expect(code).not.toContain("rehype-stringify");
  });
});

describe("rewriteSource keeps what the chain did", () => {
  const rewrite = (source: string, file = "x.ts") => rewriteSource(source, file);
  const head = `import { remark } from "remark";\nimport html from "remark-html";\n`;

  it("drops raw HTML unless the chain kept it", () => {
    expect(
      rewrite(
        `${head}export const f = async (md: string) => String(await remark().use(html).process(md));\n`,
      ).code,
    ).toContain("comarkOptions({ html: false, gfm: false, frontmatter: false })");
    const raw = `import { unified } from "unified";\nimport remarkParse from "remark-parse";\nimport remarkRehype from "remark-rehype";\nimport rehypeRaw from "rehype-raw";\nimport rehypeStringify from "rehype-stringify";\nexport const f = async (md: string) => String(await unified().use(remarkParse).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeStringify).process(md));\n`;
    expect(rewrite(raw).code).toContain("comarkOptions({ gfm: false, frontmatter: false })");
  });

  it.each([
    [
      "a plugin list with the project's own plugin",
      `${head}const custom = () => () => {};\nexport const f = (md: string) => remark().use([html, custom]).process(md);\n`,
      "uses the project's own plugin (`custom`)",
    ],
    [
      "VFile fields on the result",
      `${head}export async function f(md: string) { const file = await remark().use(html).process(md); return file.data; }\n`,
      "reads `file` as the VFile",
    ],
    [
      "a VFile-like input",
      `${head}export const f = (md: string) => remark().use(html).process({ value: md });\n`,
      "VFile-like object",
    ],
    ["a callback", `${head}remark().use(html).process("x", () => {});\n`, "callback"],
    [
      "CommonJS",
      `const { remark } = require("remark");\nconst html = require("remark-html");\nmodule.exports = (md: string) => remark().use(html).process(md);\n`,
      "CommonJS",
    ],
    [
      "rehype-sanitize",
      `${head}import rehypeSanitize from "rehype-sanitize";\nexport const f = (md: string) => remark().use(html).use(rehypeSanitize).process(md);\n`,
      "rehype-sanitize has no Comark counterpart",
    ],
  ])("leaves %s", (_, source, reason) => {
    const result = rewrite(source);
    expect(result.code).toBe(source);
    expect(result.rewrites[0]?.reason).toContain(reason);
  });

  it("reuses an existing import and avoids a clashing name", () => {
    const reused = rewrite(
      `import { renderHtml } from '@comark/html';\n${head}export const f = async (md: string) => String(await remark().use(html).process(md));\n`,
    ).code;
    expect(reused.match(/renderHtml }/g)).toHaveLength(1);
    expect(reused).not.toContain("remark-html");
    const clash = rewrite(
      `${head}const renderHtml = 1;\nexport const f = async (md: string) => String(await remark().use(html).process(md));\n`,
    ).code;
    expect(clash).toContain("import { renderHtml as renderHtmlFromComark }");
    expect(clash).toContain("renderHtmlFromComark(md,");
  });
});

describe("rewriteSource on the review's inputs", () => {
  const unified = `import { unified } from "unified";\nimport remarkParse from "remark-parse";\nimport remarkRehype from "remark-rehype";\nimport rehypeRaw from "rehype-raw";\nimport rehypeStringify from "rehype-stringify";\n`;
  const chain = (bridge = "") =>
    `unified().use(remarkParse).use(remarkRehype${bridge}).use(rehypeRaw).use(rehypeStringify)`;

  it("reads the HTML policy from the options, not from comments", () => {
    expect(
      rewriteSource(
        `${unified}export const f = async (md: string) => String(await ${chain(", {/* allowDangerousHtml: true */}")}.process(md));\n`,
        "x.ts",
      ).code,
    ).toContain("html: false");
  });

  it.each([
    [
      "options in a variable",
      `${unified}const options = { allowDangerousHtml: true };\nexport const f = async (md: string) => String(await ${chain(", options")}.process(md));\n`,
      "can't read",
    ],
    [
      "a destructured VFile",
      `${unified}export async function f(md: string) { const { value } = await ${chain()}.process(md); return value; }\n`,
      "uses the VFile",
    ],
    [
      "a VFile in a variable",
      `${unified}const file = { value: "x" };\nexport const f = () => ${chain()}.process(file);\n`,
      "VFile-like",
    ],
    [
      "VFile fields in then",
      `${unified}export const f = (md: string) => ${chain()}.process(md).then((file) => file.value);\n`,
      "in `.then`",
    ],
  ])("leaves %s", (_, source, reason) => {
    const result = rewriteSource(source, "x.ts");
    expect(result.code).toBe(source);
    expect(result.rewrites[0]?.reason).toContain(reason);
  });

  it("calls an existing aliased import by its alias", () => {
    const code = rewriteSource(
      `import { renderHtml as render } from "@comark/html";\n${unified}export const f = async (md: string) => String(await ${chain()}.process(md));\nexport const g = render;\n`,
      "x.ts",
    ).code;
    expect(code).toContain("render(md, comarkOptions(");
    expect(code.match(/@comark\/html/g)).toHaveLength(1);
  });
});

describe("rewriteSource on the second review's inputs", () => {
  const head = `import { unified } from "unified";\nimport p from "remark-parse";\nimport r from "remark-rehype";\nimport s from "rehype-stringify";\n`;
  const wrap = (chain: string) =>
    `export const f = async (md: string) => String(await ${chain});\n`;

  it.each([
    [
      "a plugin registered twice",
      `${head}import raw from "rehype-raw";\n${wrap("unified().use(p).use(r, { allowDangerousHtml: true }).use(r, { allowDangerousHtml: false }).use(raw).use(s).process(md)")}`,
      "more than once",
    ],
    [
      "a preset object in a plugin array",
      `${head}function custom() { return (tree) => { tree.children = []; }; }\n${wrap("unified().use([p, r, { plugins: [custom] }, s]).process(md)")}`,
      "a preset object",
    ],
    [
      "a parameter named like an import",
      `${head}import gfm from "remark-gfm";\nexport const f = async (md, gfm) => String(await unified().use(p).use(gfm).use(r).use(s).process(md));\n`,
      "also bound locally",
    ],
    [
      "a VFile input",
      `${head}import { VFile } from "vfile";\n${wrap('unified().use(p).use(r).use(s).process(new VFile("# Hello"))')}`,
      "VFile-like",
    ],
    [
      "a typed input",
      `${head}export const f = async (md: { value: string }) => String(await unified().use(p).use(r).use(s).process(md));\n`,
      "typed as something other",
    ],
    [
      "a destructured then",
      `${head}export const f = (md: string) => unified().use(p).use(r).use(s).process(md).then(({ value }) => value);\n`,
      "in `.then`",
    ],
    [
      "a bracket read",
      `${head}export async function f(md: string) { const file = await unified().use(p).use(r).use(s).process(md); return file["value"]; }\n`,
      "reads `file`",
    ],
    [
      "a returned VFile",
      `${head}export const f = (md: string) => unified().use(p).use(r).use(s).process(md);\n`,
      "callers would change",
    ],
    [
      "remark-rehype handlers",
      `${head}${wrap("unified().use(p).use(r, { handlers: {} }).use(s).process(md)")}`,
      "options to remark-rehype",
    ],
    [
      "rehype-katex options",
      `${head}import math from "remark-math";\nimport katex from "rehype-katex";\n${wrap("unified().use(p).use(math).use(r).use(katex, { macros: {} }).use(s).process(md)")}`,
      "options to rehype-katex",
    ],
    [
      "processor data",
      `${head}${wrap('unified().use(p).use(r).data("settings", {}).use(s).process(md)')}`,
      "`.data()`",
    ],
  ])("leaves %s", (_, source, reason) => {
    const result = rewriteSource(source, "x.ts");
    expect(result.code).toBe(source);
    expect(result.rewrites[0]?.reason).toContain(reason);
  });

  it("leaves an Astro component whose frontmatter only holds a script tag in a string", () => {
    const source =
      '---\nconst example = `<script>\nimport { remark } from "remark";\nimport html from "remark-html";\nremark().use(html).process("x");\n</script>`;\n---\n<p>Keep</p>\n';
    expect(rewriteSource(source, "x.astro").code).toBe(source);
  });

  it("picks names nothing in the file uses, globals included", () => {
    const code = rewriteSource(
      `${head}import math from "remark-math";\nexport const f = async (renderHtml, md: string) => String(await unified().use(p).use(math).use(r).use(s).process(md)) + Math.random();\n`,
      "x.ts",
    ).code;
    expect(code).toContain("import { renderHtml as renderHtmlFromComark }");
    expect(code).toContain("Math as MathFromComark");
    expect(code).toContain("Math.random()");
  });

  it("keeps imports read elsewhere, side-effect imports, and imports a component's template reads", () => {
    const code = rewriteSource(
      `import "./register.js";\n${head}${wrap("unified().use(p).use(r).use(s).process(md)")}export const saved = true ? p : null;\n`,
      "x.ts",
    ).code;
    expect(code).toContain('import "./register.js";');
    expect(code).toContain('import p from "remark-parse";');
    expect(code).not.toContain('import s from "rehype-stringify";');
    const svelte = rewriteSource(
      `<script>\n${head}const body = String(await unified().use(p).use(r).use(s).process("x"));\n</script>\n<button onclick={() => console.log(p)}>Inspect</button>\n`,
      "x.svelte",
    ).code;
    expect(svelte).toContain('import p from "remark-parse";');
  });

  it("imports renderHtml as a value when the file only has it as a type", () => {
    const code = rewriteSource(
      `import { type renderHtml } from "@comark/html";\n${head}${wrap("unified().use(p).use(r).use(s).process(md)")}`,
      "x.ts",
    ).code;
    expect(code).toMatch(/import \{ renderHtml as renderHtmlFromComark \} from "@comark\/html";/);
  });

  it("turns off the syntax the chain didn't have, and keeps `$` in options", () => {
    const code = rewriteSource(
      `${head}import slug from "rehype-slug";\n${wrap('unified().use(p).use(r).use(slug, { prefix: "$&" }).use(s).process(md)')}`,
      "x.ts",
    ).code;
    expect(code).toContain("gfm: false, frontmatter: false");
    expect(code).not.toContain("$options");
  });

  it("reads Nuxt's object-form plugin lists, arrays passed by name, and spaced lang attributes", () => {
    expect(
      scanSource(
        `export default defineNuxtConfig({ content: { build: { markdown: { remarkPlugins: { "remark-gfm": {} } } } } });\n`,
        "nuxt.config.ts",
      )[0]?.plugins.map((plugin) => plugin.name),
    ).toEqual(["remark-gfm"]);
    expect(
      scanSource(
        `${head}const plugins = [p, r, s];\nunified().use(plugins).process(md);\n`,
        "x.ts",
      )[0]?.plugins.map((plugin) => plugin.name),
    ).toEqual(["remark-parse", "remark-rehype", "rehype-stringify"]);
    expect(
      scanSource(
        `<script setup lang = "ts">\nimport gfm from "remark-gfm";\nconst md: string = "x";\nconst config = { remarkPlugins: [gfm] };\n</script>\n`,
        "x.vue",
      )[0]?.plugins.map((plugin) => plugin.name),
    ).toEqual(["remark-gfm"]);
  });
});

describe("rewriteSource on the PR review's inputs", () => {
  const head = `import { remark } from "remark";\nimport html from "remark-html";\n`;
  it.each([
    ['const input = Buffer.from("# Hi");', ""],
    ["const input = 42;", ""],
    ["const input = true;", ""],
    ["const input = /text/;", ""],
    ['import input from "./input.js";', ""],
    ["", "input"],
    ["", ""],
    ['let input = "# Hi"; input = Buffer.from("# Other");', ""],
    ['const input = "# Hi";', "input"],
    ["function other(input: string) { return input; }", ""],
  ])(
    "leaves identifier inputs without a proven string binding: %s %s",
    (declaration, parameter) => {
      const source = `${head}${declaration}\nexport const f = async (${parameter}) => String(await remark().use(html).process(input));`;
      const result = rewriteSource(source, "x.ts");
      expect(result.code).toBe(source);
      expect(result.rewrites[0]?.reason).toContain("binding isn't proven to be a string");
    },
  );

  it.each(['const input = "# Hi";', "const input = `# ${title}`;"])(
    "rewrites a const string binding: %s",
    (declaration) => {
      const result = rewriteSource(
        `${head}${declaration}\nexport const f = async () => String(await remark().use(html).process(input));`,
        "x.ts",
      );
      expect(result.rewrites[0]?.rewritten).toBe(true);
    },
  );

  it.each([
    [
      "a rehype processor, which parses HTML",
      `import { rehype } from "rehype";\nimport stringify from "rehype-stringify";\nexport const f = async (md: string) => String(await rehype().use(stringify).process(md));\n`,
      "parses HTML",
    ],
    [
      "remark-toc, whose list Comark's toc() doesn't render",
      `${head}import toc from "remark-toc";\nexport const f = async (md: string) => String(await remark().use(toc).use(html).process(md));\n`,
      "visible table of contents",
    ],
    [
      "a property that may hold a VFile",
      `${head}export const f = async (ctx) => String(await remark().use(html).process(ctx.file));\n`,
      "an expression",
    ],
    [
      "a Buffer slice",
      `${head}export const f = async (buffer) => String(await remark().use(html).process(buffer.slice(0)));\n`,
      "an expression",
    ],
    [
      "a VFile read in a closure written above",
      `${head}export async function f() { const read = () => file.value; const file = await remark().use(html).process("x"); return [String(file), read()]; }\n`,
      "reads `file`",
    ],
    [
      "a tagged template",
      `${head}const tag = (_, file) => file.value;\nexport const f = async () => tag\`\${await remark().use(html).process("x")}\`;\n`,
      "can't prove",
    ],
  ])("leaves %s", (_, source, reason) => {
    const result = rewriteSource(source, "x.ts");
    expect(result.code).toBe(source);
    expect(result.rewrites[0]?.reason).toContain(reason);
  });

  it("rewrites an inner chain first and leaves the outer one, with the imports it still reads", () => {
    const { code, rewrites } = rewriteSource(
      `import { remark } from "remark";\nimport html from "remark-html";\nexport const f = async () => String(await remark().use(html).process(String(await remark().use(html).process("x"))));\n`,
      "x.ts",
    );
    expect(rewrites.map((rewrite) => rewrite.rewritten)).toEqual([false, true]);
    expect(rewrites[0]?.reason).toContain("holds another unified chain");
    expect(code).toContain('import { remark } from "remark";');
    expect(code).toContain("renderHtml(");
  });

  it("imports renderHtml under an alias when a parameter shadows the file's own import", () => {
    const code = rewriteSource(
      `import { renderHtml } from "@comark/html";\nimport { remark } from "remark";\nimport html from "remark-html";\nexport async function f(renderHtml) { return String(await remark().use(html).process("x")); }\n`,
      "x.ts",
    ).code;
    expect(code).toContain("renderHtmlFromComark(");
  });
});

describe("scanSource in component markup", () => {
  it("keeps empty ReactMarkdown lists and attributes plugin props to their own element", () => {
    const setups = scanSource(
      `import Markdown from "react-markdown";
import gfm from "remark-gfm";
const empty = [];
export const C = () => <><Markdown remarkPlugins={[]} /><Markdown remarkPlugins={empty} rehypePlugins={[]} /><Other remarkPlugins={[gfm]} /></>;`,
      "a.tsx",
    );
    expect(setups.map((setup) => [setup.host, setup.plugins.map((plugin) => plugin.name)])).toEqual(
      [
        ["react-markdown", []],
        ["react-markdown", []],
        ["component", ["remark-gfm"]],
      ],
    );
  });

  it("reads plugin lists in Svelte and Vue markup, and a react-markdown with no plugins", () => {
    const names = (source: string, file: string) =>
      scanSource(source, file).map((setup) => [
        setup.host,
        setup.plugins.map((plugin) => plugin.name),
      ]);
    expect(
      names(
        `<script>\nimport math from "remark-math";\n</script>\n<Markdown remarkPlugins={[math]} md={text} />\n`,
        "a.svelte",
      ),
    ).toEqual([["component", ["remark-math"]]]);
    expect(
      names(
        `<template>\n  <Remark :remark-plugins="[gfm]" />\n</template>\n<script setup>\nimport gfm from "remark-gfm";\n</script>\n`,
        "a.vue",
      ),
    ).toEqual([["component", ["remark-gfm"]]]);
    expect(
      names(
        `import ReactMarkdown from "react-markdown";\nexport const C = ({ t }) => <ReactMarkdown>{t}</ReactMarkdown>;\n`,
        "a.tsx",
      ),
    ).toEqual([["react-markdown", []]]);
  });
});
