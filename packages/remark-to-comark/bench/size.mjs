// Bundles each pipeline for the browser, minified, and prints its size and gzipped size.
// Run from packages/remark-to-comark: node bench/size.mjs
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
// tsdown re-exports the rolldown it builds the packages with.
import { Rolldown } from "tsdown";

const setup = fileURLToPath(new URL("../src/setup.ts", import.meta.url));

const entries = {
  "remark + rehype-raw": `
    import { unified } from "unified";
    import remarkParse from "remark-parse";
    import remarkGfm from "remark-gfm";
    import remarkFrontmatter from "remark-frontmatter";
    import remarkRehype from "remark-rehype";
    import rehypeRaw from "rehype-raw";
    import rehypeStringify from "rehype-stringify";
    export const render = (markdown) => unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter)
      .use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeStringify).process(markdown);`,
  remark: `
    import { unified } from "unified";
    import remarkParse from "remark-parse";
    import remarkGfm from "remark-gfm";
    import remarkFrontmatter from "remark-frontmatter";
    import remarkRehype from "remark-rehype";
    import rehypeStringify from "rehype-stringify";
    export const render = (markdown) => unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter)
      .use(remarkRehype, { allowDangerousHtml: true }).use(rehypeStringify, { allowDangerousHtml: true }).process(markdown);`,
  "Comark, comarkOptions()": `
    import { renderHtml } from "@comark/html";
    import { comarkOptions } from ${JSON.stringify(setup)};
    export const render = (markdown) => renderHtml(markdown, comarkOptions());`,
};

for (const [name, source] of Object.entries(entries)) {
  const bundle = await Rolldown.rolldown({
    input: "entry",
    platform: "browser",
    logLevel: "silent",
    plugins: [
      {
        name: "entry",
        resolveId: (id) => (id === "entry" ? id : null),
        load: (id) => (id === "entry" ? source : null),
      },
    ],
  });
  const { output } = await bundle.generate({ minify: true, codeSplitting: false });
  const code = output.map((chunk) => chunk.code ?? "").join("");
  const kib = (size) => `${(size / 1024).toFixed(0)} KiB`;
  console.log(
    `${name.padEnd(26)} ${kib(Buffer.byteLength(code)).padStart(9)}  ${kib(gzipSync(code).length).padStart(8)} gzip`,
  );
}
