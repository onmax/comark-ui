// Opens every playground link in the built docs the way the playground does. A link carries its files in the fragment,
// `#code=…`, with a preset as its template. The code must decode against the presets, and the Markdown must parse with
// the playground's plugins and the link's config without issues. docs/links.ts checks the rest of each link.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseMarkdown } from "comark";
import { defaultConfig, readConfig } from "./config.ts";
import { decodePlaygroundLink, readPlaygroundHash } from "@vite-hub/ui-playground/playground";
import { configFile, contentFile, playable, templateOf } from "./play-link.ts";
import { browserPlugins } from "./plugins.ts";

const root = new URL("./dist/public/", import.meta.url).pathname;
if (!existsSync(root)) throw new Error("Build the docs first: pnpm docs:generate.");

const pages = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? pages(join(dir, entry.name))
      : entry.name.endsWith(".html")
        ? [join(dir, entry.name)]
        : [],
  );

const templates = (
  JSON.parse(readFileSync(join(root, "play/presets.json"), "utf8")) as {
    id: string;
    source: string;
  }[]
).map(templateOf);

async function problemOf(hash: string) {
  const code = readPlaygroundHash(hash);
  if (!code) return "it has no `#code=`";
  const state = await decodePlaygroundLink(code, templates);
  if (!state) return "its code doesn't decode, or names a preset that doesn't exist";
  const source = state.files[contentFile];
  if (source === undefined) return `it has no ${contentFile}`;
  if (!playable(source)) return "its Markdown includes files, which the playground can't read";
  const { config, issues } = readConfig(state.files[configFile] ?? defaultConfig);
  const { meta } = await parseMarkdown(source, {
    plugins: browserPlugins(config, { download: false }),
  });
  const all = [...issues, ...(meta.issues ?? [])];
  return all.length ? `the playground reports: ${all.join(" ")}` : undefined;
}

const checked = new Map<string, Promise<string | undefined>>();
const problems = new Set<string>();
let links = 0;
// The preset column is a piece of the playground, not a page.
for (const file of pages(root).filter((file) => relative(root, file) !== "play/presets.html")) {
  const page = `/${relative(root, file)}`.replace(/(\/index)?\.html$/, "") || "/";
  for (const [, hash] of readFileSync(file, "utf8").matchAll(/href="\/play\/?(#[^"]+)"/g)) {
    const state = hash!.replaceAll("&amp;", "&");
    if (!checked.has(state)) checked.set(state, problemOf(state));
    const problem = await checked.get(state);
    links++;
    if (problem) problems.add(`${page} links to the playground, but ${problem}. Fix the link.`);
  }
}

if (problems.size) {
  console.error(`${problems.size} playground link${problems.size === 1 ? "" : "s"} won't open:`);
  for (const problem of [...problems].toSorted()) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`Opened ${checked.size} playground states from ${links} links.`);
