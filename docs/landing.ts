// The landing's data, written before Nuxt starts: the package list it shows without a script and the repository's
// stars, in .generated/landing.json, and a card for every example on the canvas, drawn by the plugins' HTML renderers,
// in public/canvas-cards.json. The cards are nearly half the landing's bytes and draw nothing until the canvas does,
// so they're a file it fetches.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown, type Node } from "comark";
import { escapeHtml, textContent } from "comark/utils";
import { icons as lucide } from "@iconify-json/lucide";
import { parse } from "yaml";
import { createIcons, iconHtml } from "../packages/icon/src/html.ts";
import include from "../packages/include/src/index.ts";
import { lint, type Diagnostic } from "../packages/lint/src/index.ts";
import { isElement } from "../shared/nodes.ts";
import { rawText } from "../shared/text.ts";
import { loadExamples, thirdParty } from "./examples.ts";
import { browserPlugins, components } from "./plugins.ts";
import { packageOrder } from "./sections.ts";

const repo = new URL("../", import.meta.url);
const docs = new URL("./", import.meta.url);

export interface LandingPackage {
  slug: string;
  label: string;
  /** Lucide's name for it, without a prefix. */
  icon: string;
  blurb: string;
  npm: string;
}

const frontmatter = (file: URL) =>
  (parse(/^---\n([\s\S]*?)\n---\n/.exec(readFileSync(file, "utf8"))?.[1] ?? "") ?? {}) as Record<
    string,
    unknown
  >;
const indexOf = (slug: string) =>
  slug in thirdParty
    ? new URL(`docs/pages/${slug}/index.md`, repo)
    : new URL(`packages/${slug}/docs/index.md`, repo);

const packages: LandingPackage[] = packageOrder
  .filter((slug) => existsSync(indexOf(slug)))
  .map((slug) => {
    const { title, icon, blurb } = frontmatter(indexOf(slug));
    if (typeof title !== "string" || typeof icon !== "string" || typeof blurb !== "string")
      throw new Error(`${indexOf(slug).pathname} needs a title, an icon, and a blurb.`);
    const npm =
      thirdParty[slug] ??
      (
        JSON.parse(readFileSync(new URL(`packages/${slug}/package.json`, repo), "utf8")) as {
          name: string;
        }
      ).name;
    return { slug, label: title, icon, blurb, npm };
  });

// Lucide's icons come from the installed set, so a slow Iconify API can't fail the build. Annotate's is a hand-drawn
// loop like its marks.
const scribble = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5.5C11.5 2.8 20.3 3.4 21.5 8.6 22.8 14.3 16.5 20 9.6 20.4 4.4 20.7 1.5 17.6 2.6 13.6 3.6 10 8.3 7.3 13.6 7.2"/></svg>`;
const iconId = (name: string) =>
  name === "scribble-loop" ? "site:scribble-loop" : `lucide:${name}`;
const icons = await createIcons({
  collections: { lucide, site: { "scribble-loop": scribble } },
  fetch: false,
}).resolve([...packages.map((pkg) => pkg.icon), "book-open"].map(iconId));
const icon = (name: string) => {
  const found = icons.get(iconId(name));
  if (!found || "problem" in found) throw new Error(`docs/landing.ts: no icon "${name}".`);
  return iconHtml(found).replace('style="', 'style="--comark-icon-size:15px;');
};

const plugins = () => [
  include({ root: new URL("packages/include/docs/", repo).pathname }),
  ...browserPlugins(
    {
      "comark-github": { references: { repo: "onmax/comark-ui" } },
      "comark-time": { now: "2026-11-04T12:00:00Z", timeZone: "UTC", locale: "en" },
    },
    { icon: { collections: { lucide } } },
  ),
];

// The size of each PNG the cards show, read from its header, so a card measures as it will show before its image loads.
const publicDir = new URL("public/", docs);
const imageSizes = new Map(
  readdirSync(publicDir)
    .filter((file) => file.endsWith(".png"))
    .map((file) => {
      const head = readFileSync(new URL(file, publicDir));
      return [file, [head.readUInt32BE(16), head.readUInt32BE(20)]] as const;
    }),
);
const sized = (html: string) =>
  html.replace(/<img\b[^>]*? src="\/([\w-]+\.png)"[^>]*>/g, (tag, file: string) => {
    const size = imageSizes.get(file);
    return size && !/\s(?:width|height)=/.test(tag)
      ? tag.replace(/ src=/, ` width="${size[0]}" height="${size[1]}" src=`)
      : tag;
  });
// A still of a rendered document: no scripts, its plugins' styles collected to go in the file once, no ids, since the
// canvas holds many copies, and a chart without its data table. Nothing in it zooms or takes focus.
const styles = new Set<string>();
const stillOf = (html: string) =>
  sized(html)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (style) => (styles.add(style), ""))
    .replace(/<script>[\s\S]*?<\/script>/g, "")
    .replace(/<details class="cch-data">[\s\S]*?<\/details>/g, "")
    .replace(/\s(id|for|aria-controls|aria-labelledby|tabindex|data-zoom[\w-]*)="[^"]*"/g, "")
    .replace(/(<[a-z][^>]*?)\sdata-zoom(?=[\s>])/g, "$1")
    .replace(/<img\b/g, '<img loading="lazy" draggable="false"');

const inlineCode = (text: string) => escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
// What comark-lint prints for a file, drawn as a terminal.
function terminal(file: string, found: Diagnostic[]) {
  const lines = [
    `<span class="term-cmd"><span aria-hidden="true">$</span> comark-lint ${file}</span>`,
    ...found.flatMap((d) => [
      `<span class="term-where">${file}:${d.line}:${d.column ?? 1} <span>${escapeHtml(d.rule)}</span></span>`,
      `<span class="term-message">${inlineCode(d.message)}</span>`,
    ]),
    `<span class="term-sum">✖ ${found.length} problem${found.length === 1 ? "" : "s"}</span>`,
  ];
  return `<div class="term">${lines.map((line, i) => `<span class="term-line" style="--i:${i}">${line}</span>`).join("")}</div>`;
}

const playIcon = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14"/></svg>`;
const copyIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const checkIcon = `<svg class="check" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5"/></svg>`;

async function renderDemo(slug: string, source: string) {
  if (slug === "lint") {
    const found = await lint(source, { plugins: browserPlugins(), components });
    if (!found.length) throw new Error("The lint demo's Markdown needs a problem to report.");
    return terminal("review.md", found);
  }
  const document = await parseMarkdown(source, { plugins: plugins() });
  if (document.meta.issues.length)
    throw new Error(`The ${slug} demo:\n${document.meta.issues.join("\n")}`);
  // Tabs show their strip, code blocks their buttons, and players their controls once their script runs, which a card
  // doesn't have. A video there drops the browser's controls, which would otherwise show over its own.
  let html = (await renderHtmlFromDocument(document, { components }))
    .replace(
      /<iframe\b[^>]*><\/iframe>/g,
      `<span class="demo-player"><span class="demo-play">${playIcon}</span></span>`,
    )
    .replaceAll('<div class="ct"', '<div class="ct" data-tabs-ready')
    .replace(/<div class="ck"(?![\w-])/g, '<div class="ck" data-code-ready')
    .replace(
      /<span class="cm cm-video"([^>]*)><video([^>]*?) controls/g,
      '<span class="cm cm-video" data-media-ready$1><video$2',
    )
    .replaceAll('<span class="cm cm-audio"', '<span class="cm cm-audio" data-media-ready');
  // An include shows what it reads, since the page alone doesn't say.
  if (slug === "include")
    html = `<p class="demo-directive"><code>${escapeHtml(source.trim())}</code></p>${html}`;
  return stillOf(html);
}

interface Demo {
  id: string;
  pkg: Pick<LandingPackage, "slug" | "label" | "icon" | "npm">;
  /** The page the card opens. */
  page: string;
  label: string;
  source: string;
}

// A card is titled as the sidebar titles its page; its copy button gives the package.
async function demoCard({ id, pkg, page, label, source }: Demo) {
  const still = await renderDemo(pkg.slug, source);
  const command = escapeHtml(`pnpm add ${pkg.npm}`);
  return (
    `<article class="demo demo-${pkg.slug.replaceAll("/", "-")}" data-package="${pkg.slug}" data-example="${id}">` +
    `<a class="demo-link" href="/${page}" draggable="false" tabindex="-1">${icon(pkg.icon)}<strong>${escapeHtml(pkg.label)}</strong>${label ? `<span>${escapeHtml(label.toLowerCase())}</span>` : ""}</a>` +
    `<button type="button" class="demo-copy" data-copy="${command}" tabindex="-1" title="Copy ${command}" aria-label="Copy ${command}">${copyIcon}${checkIcon}</button>` +
    `<div class="demo-screen" inert><div class="demo-page">${still}</div></div></article>`
  );
}

// The cards in a fixed shuffle, so neighbours on the canvas are mostly of different packages, and never two of one
// package in a row.
function deal(demos: Demo[]) {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const deck = demos
    .map((demo) => ({ demo, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ demo }) => demo);
  const dealt: Demo[] = [];
  while (deck.length) {
    const at = deck.findIndex((demo) => demo.pkg.slug !== dealt.at(-1)?.pkg.slug);
    dealt.push(...deck.splice(Math.max(0, at), 1));
  }
  return dealt;
}

// A `:::demo` in the landing's `::packages` adds a card for a package with no examples, such as lint's report.
const landing = await parseMarkdown(readFileSync(new URL("docs/pages/index.md", repo), "utf8"));
const block = landing.nodes.find((node) => isElement(node) && node[0] === "packages");
// SAFETY: an element node is [tag, attributes, ...children].
const extra: Demo[] = (isElement(block) ? (block.slice(2) as Node[]) : [])
  .filter(isElement)
  .map((node) => {
    const [, attrs, ...content] = node;
    const pkg = packages.find((pkg) => pkg.slug === rawText(attrs.package));
    if (!pkg) throw new Error(`A demo names no package: "${rawText(attrs.package)}".`);
    const pre = content.find((child) => isElement(child) && child[0] === "pre");
    if (!pre) throw new Error(`The ${pkg.slug} demo needs a fenced code block.`);
    return {
      id: pkg.slug,
      pkg,
      page: pkg.slug,
      label: rawText(attrs.label),
      source: textContent(pre),
    };
  });

const recipeInstall = (page: string) =>
  rawText(frontmatter(new URL(`docs/pages/${page}.md`, repo)).install).replace(/^pnpm add /, "");
const cards: Demo[] = (await loadExamples(packageOrder)).map((example) => {
  const pkg = packages.find((pkg) => pkg.slug === example.group);
  if (pkg) return { ...example, pkg };
  // A recipe links to its page and copies its install command.
  return {
    ...example,
    pkg: {
      slug: example.page,
      label: "recipe",
      icon: "book-open",
      npm: recipeInstall(example.page),
    },
    label: example.page.slice("recipes/".length),
  };
});

// The repository's stars, read once per build. Offline or rate-limited, the button just says GitHub. The field stays in
// landing.json as null then, so the type LandingHero.vue reads from it keeps `stars`.
const stars = await fetch("https://api.github.com/repos/onmax/comark-ui", {
  headers: { accept: "application/vnd.github+json" },
  signal: AbortSignal.timeout(5000),
})
  .then((response) =>
    response.ok ? (response.json() as Promise<{ stargazers_count?: number }>) : undefined,
  )
  .then((repo) => repo?.stargazers_count)
  .catch(() => undefined);

const demos = [];
for (const demo of deal([...cards, ...extra])) demos.push(await demoCard(demo));
mkdirSync(new URL(".generated/", docs), { recursive: true });
writeFileSync(
  new URL(".generated/landing.json", docs),
  `${JSON.stringify({ packages, stars: stars ?? null }, null, 2)}\n`,
);
writeFileSync(
  new URL("canvas-cards.json", publicDir),
  JSON.stringify([...styles, ...demos].join("")),
);
console.log(`docs/landing.ts: ${demos.length} cards`);
