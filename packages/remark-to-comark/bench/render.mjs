// Renders the same Markdown with a remark pipeline and with Comark, and prints the time per pass.
// Run from packages/remark-to-comark: node bench/render.mjs [glob], with the glob relative to the repository root.
// With no glob, dependencies are excluded; an explicit glob can select node_modules.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderHtml } from "@comark/html";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { glob } from "tinyglobby";
import { unified } from "unified";
import { comarkOptions } from "../src/setup.ts";

const explicitPattern = process.argv[2];
const pattern = explicitPattern ?? "**/*.md";
const root = fileURLToPath(new URL("../../..", import.meta.url));
const files = await glob(pattern, {
  cwd: root,
  absolute: true,
  ignore: ["**/dist/**", ...(explicitPattern === undefined ? ["**/node_modules/**"] : [])],
});
if (files.length === 0) {
  console.error(`No files matched ${JSON.stringify(pattern)} relative to ${root}`);
  process.exit(1);
}
const documents = files.map((file) => readFileSync(file, "utf8"));
const bytes = documents.reduce((total, markdown) => total + Buffer.byteLength(markdown), 0);

const remark = (raw) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .use(remarkRehype, { allowDangerousHtml: true });
  if (raw) processor.use(rehypeRaw);
  processor.use(rehypeStringify, { allowDangerousHtml: true });
  return async (markdown) => String(await processor.process(markdown));
};
const options = comarkOptions();

const pipelines = {
  "remark + rehype-raw": remark(true),
  remark: remark(false),
  "Comark, comarkOptions()": (markdown) => renderHtml(markdown, options),
};

async function pass(render) {
  const start = performance.now();
  for (const markdown of documents) await render(markdown);
  return performance.now() - start;
}

for (const render of Object.values(pipelines)) for (let i = 0; i < 3; i++) await pass(render);

// Interleaved, so load from other processes lands on every pipeline alike.
const times = Object.fromEntries(Object.keys(pipelines).map((name) => [name, []]));
for (let round = 0; round < 15; round++)
  for (const [name, render] of Object.entries(pipelines)) times[name].push(await pass(render));

const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
const baseline = median(times.remark);
console.log(`${files.length} files, ${(bytes / 1024).toFixed(0)} KiB, median of 15 passes\n`);
for (const [name, values] of Object.entries(times)) {
  const ms = median(values);
  const speed = bytes / 1024 / 1024 / (ms / 1000);
  console.log(
    `${name.padEnd(26)} ${ms.toFixed(0).padStart(6)} ms  ${speed.toFixed(1).padStart(5)} MiB/s  ${(baseline / ms).toFixed(2)}x remark`,
  );
}
