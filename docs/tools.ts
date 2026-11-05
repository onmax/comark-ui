// Writes what the playground and the component gallery read, rendered from docs/examples.ts with the plugins the
// pages use: docs/.generated/tools/ is served as is (each gallery cell's document, the presets' stills, the preview's
// stylesheet), and docs/.generated/tools-data/ is imported by the pages in docs/app/pages/play/. Rendering every
// example takes seconds and Shiki, so it runs once before Nuxt, like docs/content.ts, instead of on every request.
import { fileURLToPath } from "node:url";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { renderHtmlFromDocument } from "@comark/html";
import { icons as lucide } from "@iconify-json/lucide";
import { parseMarkdown } from "comark";
import { escapeHtml } from "comark/utils";
import { parse } from "yaml";
import { build } from "vite";
import { css as criticCss } from "../packages/critic/src/index.ts";
import { defaultConfig } from "./config.ts";
import { highlighted, sitePlugins, withoutFor } from "./example-plugins.ts";
import { loadExamples, thirdParty } from "./examples.ts";
import { highlight } from "./highlight.ts";
import { components } from "./plugins.ts";
import { propsOf } from "./props.ts";
import { cellDocument } from "./preview.ts";
import { packageOrder } from "./sections.ts";

const root = new URL("./", import.meta.url);
const repo = new URL("../", root);
const out = new URL(".generated/tools/", root);
const data = new URL(".generated/tools-data/", root);
rmSync(out, { recursive: true, force: true });
rmSync(data, { recursive: true, force: true });
mkdirSync(new URL("play/gallery/", out), { recursive: true });
mkdirSync(data, { recursive: true });

// A lucide icon as inline SVG, for the markup written here; the pages draw theirs with UIcon.
export const lucideSvg = (name: string, size = 14) => {
  const icon = lucide.icons[name] ?? lucide.icons.box!;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${icon.body}</svg>`;
};

// Each package's name, icon, and npm name, from its overview, as the docs' rail shows them.
const overview = (slug: string) =>
  slug in thirdParty
    ? new URL(`docs/pages/${slug}/index.md`, repo)
    : new URL(`packages/${slug}/docs/index.md`, repo);
const packages = packageOrder.flatMap((slug) => {
  const file = overview(slug);
  if (!existsSync(file)) return [];
  const front = (parse(/^---\n([\s\S]*?)\n---\n/.exec(readFileSync(file, "utf8"))?.[1] ?? "") ??
    {}) as Record<string, unknown>;
  const npm =
    thirdParty[slug] ??
    (
      JSON.parse(readFileSync(new URL(`packages/${slug}/package.json`, repo), "utf8")) as {
        name: string;
      }
    ).name;
  const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
  return [{ slug, label: text(front.title, slug), icon: text(front.icon, "box"), npm }];
});
const packageOf = (group: string) => packages.find((pkg) => pkg.slug === group);

const examples = await loadExamples(packageOrder);
const presets = examples
  .filter((example) => example.playable)
  .map(({ id, label, group, source }) => {
    const pkg = packageOf(group);
    return { id, label, group: pkg?.label ?? "Recipes", npm: pkg?.npm ?? "", source };
  });

// A still of a rendered document: no scripts, its plugins' styles collected into `styles` to go in the page once,
// no ids, since a page holds many, and so no link to one, and a chart without its data table, so the still is all
// plot. Nothing in it zooms or takes focus.
const stillOf = (html: string, styles: Set<string>) =>
  html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (style) => (styles.add(style), ""))
    .replace(/<script>[\s\S]*?<\/script>/g, "")
    .replace(/<details class="cch-data">[\s\S]*?<\/details>/g, "")
    .replace(/<a class="cl-anchor"[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/(<a\b[^>]*?)\shref="[^"]*"/g, "$1")
    .replace(/\s(id|for|aria-controls|aria-labelledby|tabindex|data-zoom[\w-]*)="[^"]*"/g, "")
    .replace(/(<[a-z][^>]*?)\sdata-zoom(?=[\s>])/g, "$1")
    .replace(/<img\b/g, '<img loading="lazy" draggable="false"');

// The presets' column: a still of each preset over its name, with a gray box for each player, so the column loads
// nothing but the pages' own images. The playground scales each still to its card.
const stillStyles = new Set<string>();
const stills = new Map(
  await Promise.all(
    presets.map(async (preset) => {
      const document = await parseMarkdown(preset.source, { plugins: sitePlugins() });
      const html = (await renderHtmlFromDocument(document, { components })).replace(
        /<iframe\b[^>]*><\/iframe>|<(video|audio) class="cm"[^>]*>.*?<\/\1>|<span class="cm cm-(?:audio|video)"[^>]*>.*?<\/button><\/span><\/span>/g,
        `<span class="preset-player">${lucideSvg("tv-minimal-play", 128)}</span>`,
      );
      return [preset.id, stillOf(html, stillStyles)] as const;
    }),
  ),
);
const column = [...new Set(presets.map((preset) => preset.group))]
  .map((group) => {
    const icon = packages.find((pkg) => pkg.label === group)?.icon ?? "book-open";
    const cards = presets
      .filter((preset) => preset.group === group)
      .map(
        (preset) =>
          `<div class="preset"><div class="preset-thumb" aria-hidden="true" inert><div class="preset-page">${stills.get(preset.id) ?? ""}</div></div><a data-preset="${preset.id}" href="#preset=${preset.id}">${escapeHtml(preset.label)}</a></div>`,
      )
      .join("");
    return `<p class="nav-group">${lucideSvg(icon)}${escapeHtml(group)}</p><div class="presets">${cards}</div>`;
  })
  .join("");
writeFileSync(new URL("play/presets.html", out), `${[...stillStyles].join("")}${column}`);
writeFileSync(
  new URL("play/presets.json", out),
  JSON.stringify(presets.map(({ id, source, npm }) => ({ id, source, npm }))),
);

// The playground opens on the first preset, with its Markdown and the config already colored, so the editor reads
// before the grammar loads in the browser.
const first = presets[0]!;
writeFileSync(
  new URL("play.json", data),
  JSON.stringify({
    npm: first.npm,
    source: first.source,
    config: defaultConfig,
    sourcePaint: highlight(`${first.source}\n `),
    configPaint: highlight(`${defaultConfig}\n `, "json"),
  }),
);

// The gallery: each example's document, the groups the page lists, and what its editor needs: each example it can
// render, and the values each package's docs list for its props.
await Promise.all(
  examples.map(async (example) => {
    const document = await parseMarkdown(example.source, {
      plugins: highlighted(
        sitePlugins().filter((plugin) => !withoutFor(example.group).includes(plugin.name)),
      ),
    });
    if (document.meta.issues.length)
      throw new Error(`Example "${example.id}":\n${document.meta.issues.join("\n")}`);
    const html = await renderHtmlFromDocument(document, { components });
    writeFileSync(new URL(`play/gallery/${example.id}.html`, out), cellDocument(html));
  }),
);
const docsPath = (page: string) => `/${page}`;
const galleryGroups = [...new Set(examples.map((example) => example.group))].map((group) => {
  const pkg = packageOf(group);
  return {
    slug: group,
    label: pkg?.label ?? "Recipes",
    icon: pkg?.icon ?? "book-open",
    npm: pkg?.npm ?? "",
    examples: examples
      .filter((example) => example.group === group)
      .map((example) => ({
        id: example.id,
        label: example.label || pkg?.label || example.page,
        page: docsPath(example.page),
        playable: example.playable,
      })),
  };
});
writeFileSync(new URL("gallery.json", data), JSON.stringify(galleryGroups));
writeFileSync(
  new URL("play/gallery/data.json", out),
  JSON.stringify({
    cells: Object.fromEntries(
      galleryGroups.flatMap((group) =>
        examples
          .filter((example) => example.group === group.slug && example.playable)
          .map((example) => [
            example.id,
            {
              group: group.slug,
              label: group.examples.find(({ id }) => id === example.id)!.label,
              source: example.source,
            },
          ]),
      ),
    ),
    props: propsOf(
      galleryGroups.map((group) => group.slug),
      (group) =>
        existsSync(new URL(`packages/${group}/docs/`, repo))
          ? new URL(`packages/${group}/docs/`, repo)
          : new URL(`docs/pages/${group}/`, repo),
    ),
  }),
);

// The previews are documents of their own, so they load the old site's content styles and fonts from here, and
// comark-critic's, which has no component to add them.
writeFileSync(
  new URL("play/preview.css", out),
  readFileSync(new URL("play-preview.css", root), "utf8") + criticCss,
);
for (const font of ["geist-sans/Geist-Variable.woff2", "geist-mono/GeistMono-Variable.woff2"])
  cpSync(
    new URL(`node_modules/geist/dist/fonts/${font}`, repo),
    new URL(`play/fonts/${font.split("/")[1]}`, out),
  );

// The rich-text editor is its own Vite app in packages/ui/playground, served as is at /play/editor/.
await build({
  configFile: false,
  logLevel: "warn",
  root: fileURLToPath(new URL("packages/ui/playground/", repo)),
  base: "/play/editor/",
  build: { outDir: fileURLToPath(new URL("play/editor/", out)), emptyOutDir: true },
});

console.log(
  `docs/.generated/tools/ written (${presets.length} presets, ${examples.length} examples)`,
);
