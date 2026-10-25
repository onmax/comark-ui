// Renders docs/pages and each package's docs/ with the plugins themselves into docs/dist, a static site served by Cloudflare at comark-ui.onmax.me.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { renderHtmlFromDocument } from "@comark/html";
import shiki from "@comark/html/plugins/shiki";
import type { ElementNode, Node, NodeHandler } from "comark";
import { parseMarkdown } from "comark";
import { escapeHtml, textContent } from "comark/utils";
import { icons as lucide } from "@iconify-json/lucide";
import dark from "shiki/themes/vitesse-dark.mjs";
import light from "shiki/themes/vitesse-light.mjs";
import { build } from "vite";
import { css as criticCss } from "../packages/critic/src/index.ts";
import { createIcons, css as iconCss, iconHtml } from "../packages/icon/src/html.ts";
import include from "../packages/include/src/index.ts";
import { lint, type Diagnostic } from "../packages/lint/src/index.ts";
import { defaultConfig } from "./config.ts";
import { loadExamples, pageOrder, recipeOrder, thirdParty } from "./examples.ts";
import { checkExample, doctorRule, doctorRules } from "./doctor.ts";
import { highlight } from "./highlight.ts";
import { browserPlugins, components } from "./plugins.ts";
import { colorTokens, themePresets } from "./play-theme.ts";
import { previewDocument } from "./preview.ts";

const root = new URL("./", import.meta.url);
const dist = new URL("dist/", root);
const fonts = new URL("../node_modules/geist/dist/fonts/", root);
const site = "https://comark-ui.onmax.me";
// `#123` on the site links to this repository's issues.
const sitePlugins = () =>
  browserPlugins({ "comark-github": { references: { repo: "onmax/comark-ui" } } });
// Only comark-include's examples include files, so includes resolve from its docs, where their partials sit.
const contentPlugins = () => [
  include({ root: fileURLToPath(new URL("../packages/include/docs/", root)) }),
  ...sitePlugins(),
];
// The site's own links stay plain; chips show in the examples and the playground.
// Shiki goes before comark-code, which marks the lines Shiki drew. Keep this
// tied to the plugin name so adding a renderer-only plugin after code doesn't
// change the ordering required by code's line-marker validation.
const highlighted = (list: ReturnType<typeof contentPlugins>) => {
  const code = list.findIndex((plugin) => plugin.name === "comark-code");
  if (code < 0) return list;
  return [...list.slice(0, code), shiki({ themes: { light, dark } }), ...list.slice(code)];
};
const plugins = highlighted(contentPlugins().filter((plugin) => plugin.name !== "comark-chips"));

// The site's own icons, drawn the way `:icon` draws them: Lucide's, and annotate's, a hand-drawn loop like its marks.
const ownIcons = {
  "scribble-loop": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5.5C11.5 2.8 20.3 3.4 21.5 8.6 22.8 14.3 16.5 20 9.6 20.4 4.4 20.7 1.5 17.6 2.6 13.6 3.6 10 8.3 7.3 13.6 7.2"/></svg>`,
};
// The site's chrome draws these; each package's own comes from its docs' frontmatter.
const lucideNames = [
  "code-xml",
  "arrow-left",
  "arrow-right",
  "arrow-up-right",
  "blocks",
  "book-open",
  "circle-check",
  "circle-x",
  "flask-conical",
  "search",
  "stethoscope",
  "tv-minimal-play",
  "type",
];
const iconId = (name: string) => (name in ownIcons ? `site:${name}` : `lucide:${name}`);
const str = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);

const plain = (text: string) => text.replaceAll("`", "");
const inlineCode = (text: string) => escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");

// The packages in the order their sections list them. Each package's page sits in its own docs/ folder, and its
// frontmatter gives its group, icon, blurb, and credits; the group picks the section. A package with no docs yet is
// left out. A third-party plugin in `thirdParty` takes a place too, with its page in docs/pages/<slug>/.
const packageOrder = [
  "annotate",
  "cast",
  "charts",
  "diagrams",
  "mermaid",
  "chips",
  "colors",
  "diff",
  "embed",
  "media",
  "metrics",
  "table",
  "tests",
  "github",
  "properties",
  "sources",
  "icon",
  "qr",
  "links",
  "zoom",
  "carousel",
  "tabs",
  "code",
  "details",
  "file-tree",
  "fields",
  "badge",
  "code-notes",
  "cards",
  "steps",
  "quiz",
  "cjk",
  "figure",
  "mark",
  "critic",
  "deflist",
  "footnotes",
  "keys",
  "include",
  "outline",
  "xref",
  "reading-time",
  "lint",
];
const repo = new URL("../", root);
// Paths from the repository's root, so an error names the file.
const fileOf = (slug: string) => {
  const [first = "", ...rest] = slug.split("/");
  return packageOrder.includes(first) && !(first in thirdParty)
    ? `packages/${first}/docs/${rest.join("/") || "index"}.md`
    : existsSync(new URL(`docs/pages/${slug}/index.md`, repo))
      ? `docs/pages/${slug}/index.md`
      : `docs/pages/${slug || "index"}.md`;
};
const exists = (file: string) => existsSync(new URL(file, repo));
// A package with several rich components, or parts with syntax of their own, gives each its own page in
// docs/components/, listed after its page in the order that page links to them.
function componentPages(slug: string) {
  const folder = new URL(`packages/${slug}/docs/components/`, repo);
  if (!existsSync(folder)) return [];
  const linked = [
    ...readFileSync(new URL("../index.md", folder), "utf8").matchAll(
      new RegExp(`\\(/${slug}/components/([\\w-]+)/\\)`, "g"),
    ),
  ].map(([, name]) => name);
  const pages = readdirSync(folder).map((file) => file.replace(/\.md$/, ""));
  const unlisted = pages.filter((page) => !linked.includes(page));
  if (unlisted.length)
    throw new Error(
      `packages/${slug}/docs/index.md needs a link to each page in components/: ${unlisted.join(", ")}.`,
    );
  return [...new Set(linked)].map((name) => `components/${name}`);
}
// A package's group picks its section and its heading there: blocks under Components, syntax under Typography, the
// authoring tools under the docs' Utilities, and the linter on its own. comark-ui has no page: Getting started is it.
const groups = [
  "Review blocks",
  "Docs blocks",
  "Page behavior",
  "Markdown syntax",
  "Authoring tools",
  "Linter",
];
for (const folder of await readdir(new URL("packages/", repo))) {
  // A branch from before the move would add its pages where nothing reads them.
  for (const stale of [`docs/pages/${folder}`, `docs/pages/${folder}.md`])
    if (exists(stale)) throw new Error(`${stale} belongs in packages/${folder}/docs/.`);
  if (exists(`packages/${folder}/docs/index.md`) && !packageOrder.includes(folder))
    throw new Error(
      `packages/${folder}/docs has no place in the rail; add "${folder}" to packageOrder in docs/build.ts.`,
    );
}
const packages = await Promise.all(
  packageOrder
    .filter((slug) => exists(fileOf(slug)))
    .map(async (slug) => {
      const { frontmatter } = await parseMarkdown(
        await readFile(new URL(fileOf(slug), repo), "utf8"),
      );
      const manifest: unknown =
        slug in thirdParty
          ? { name: thirdParty[slug] }
          : JSON.parse(await readFile(new URL(`packages/${slug}/package.json`, repo), "utf8"));
      const [title, group, icon, blurb, credits] = [
        "title",
        "group",
        "icon",
        "blurb",
        "credits",
      ].map((key) => str(frontmatter[key]));
      if (!title || !group || !icon || !blurb)
        throw new Error(
          `${fileOf(slug)} needs a title, a group, an icon, and a blurb in its frontmatter.`,
        );
      if (!groups.includes(group))
        throw new Error(
          `${fileOf(slug)}: group "${group}" has no section; use one of ${groups.join(", ")}.`,
        );
      return {
        slug,
        label: title,
        group,
        icon,
        blurb,
        credits: credits || undefined,
        npm: str((manifest as { name?: unknown }).name),
      };
    }),
);
const siteIcons = await createIcons({
  collections: { lucide, site: ownIcons },
  fetch: false,
}).resolve(
  [...lucideNames, ...packages.map((pkg) => pkg.icon), ...Object.keys(ownIcons)].map(iconId),
);
const siteIcon = (name: string, size = 18) => {
  const found = siteIcons.get(iconId(name));
  if (!found || "problem" in found) throw new Error(`docs/build.ts: no icon "${name}".`);
  return iconHtml(found).replace('style="', `style="--comark-icon-size:${size}px;`);
};
type Package = (typeof packages)[number];
type Section = {
  slug: string;
  label: string;
  icon: string;
  lists: { title?: string; icon?: string; slugs: string[] }[];
};
// A package's page, then its components' pages.
const pagesOfPackage = (pkg: Package) =>
  pageOrder
    .flatMap((page) =>
      page === "components" ? ["components", ...componentPages(pkg.slug)] : [page],
    )
    .map((page) => (page ? `${pkg.slug}/${page}` : pkg.slug))
    .filter((slug) => exists(fileOf(slug)));
// By name, as ui.nuxt.com lists its components, so a block is found without knowing the order.
const inGroup = (group: string) =>
  packages
    .filter((pkg) => pkg.group === group)
    .toSorted((a, b) => a.label.localeCompare(b.label))
    .flatMap(pagesOfPackage);
// The rail, as on ui.nuxt.com: a few kinds of page, each a column of its pages. Blocks are documented for comark-ui,
// and each page ends with its own package for anyone who installs fewer.
const sections: Section[] = [
  {
    slug: "",
    label: "Docs",
    icon: "book-open",
    // The index is the landing page, outside every section's column.
    lists: [
      {
        slugs: [
          "getting-started",
          "guide/renderers",
          "guide/theming",
          "guide/validation",
          "guide/agents",
        ],
      },
      {
        title: "Recipes",
        slugs: recipeOrder.map((recipe) => `recipes/${recipe}`),
      },
      { title: "Utilities", slugs: inGroup("Authoring tools") },
      { title: "Compared", slugs: ["compare/charts"] },
    ],
  },
  {
    slug: "components",
    label: "Components",
    icon: "blocks",
    lists: ["Review blocks", "Docs blocks", "Page behavior"].map((group) => ({
      title: group,
      slugs: inGroup(group),
    })),
  },
  {
    slug: "typography",
    label: "Typography",
    icon: "type",
    lists: [{ slugs: inGroup("Markdown syntax") }],
  },
  // comark-linter's pages, then one page per rule: the core rules, then each package's.
  {
    slug: "lint",
    label: "Linter",
    icon: "stethoscope",
    lists: [
      { slugs: inGroup("Linter") },
      { title: "Rules", slugs: ["doctor"] },
      ...[...new Set(doctorRules.map((entry) => entry.group))].map((group) => ({
        title: group === "core" ? "Core" : group,
        icon: packages.find((pkg) => pkg.slug === (group === "core" ? "lint" : group))?.icon,
        slugs: doctorRules.filter((entry) => entry.group === group).map((entry) => entry.slug),
      })),
    ],
  },
  // Its column lists the presets, which come from the pages' examples.
  { slug: "play", label: "Playground", icon: "flask-conical", lists: [] },
];
// The package a page documents, if any.
const packageOf = (slug: string) => packages.find((pkg) => pkg.slug === slug.split("/")[0]);

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const isPre = (node: Node): node is ElementNode => isElement(node) && node[0] === "pre";
const href = (slug: string) => `/${slug}${slug ? "/" : ""}`;
// An include reads files, so the playground can't run it.
const playable = (source: string) => !/^:+include\b/m.test(source);
const playLink = (source: string) => `/play/#md=${deflateRawSync(source).toString("base64url")}`;

// An example shows the Markdown in its code block twice: rendered, and as source. It runs every plugin but the ones
// `without` names.
const exampleWithout =
  (without: string[]): NodeHandler =>
  async ([, attrs, ...children], state) => {
    const pre = children.find(isPre);
    if (!pre) throw new Error(`Example "${str(attrs.label)}" needs a fenced code block.`);
    const source = textContent(pre);
    // Highlighted like the page, so a diff in an example keeps its colors.
    const preview = await parseMarkdown(source, {
      plugins: highlighted(contentPlugins().filter((plugin) => !without.includes(plugin.name))),
    });
    if (preview.meta.issues.length)
      throw new Error(`Example "${str(attrs.label)}":\n${preview.meta.issues.join("\n")}`);
    const play = playable(source)
      ? `<a class="example-play" href="${escapeHtml(playLink(source))}">${siteIcon("flask-conical", 13)}Playground</a>`
      : "";
    return (
      `<div class="example"><div class="example-bar">${play}<div class="seg" role="group" aria-label="View">` +
      `<button type="button" data-view="preview" aria-pressed="true">Preview</button><button type="button" data-view="code" aria-pressed="false">Code</button></div></div>` +
      `<div class="example-body"><div class="example-preview">${await state.flow(["div", {}, ...preview.nodes], state)}</div>` +
      `<div class="example-code" hidden>${await state.one(pre, state)}</div></div></div>`
    );
  };

// The examples at the top of each page. Not comark-tabs: each example's Preview/Code switch shares the tab row.
const exampleTabs: NodeHandler = async ([, , ...children], state) => {
  const panels = children.filter(isElement);
  const labels = panels.map((panel, i) => {
    const label = escapeHtml(str(panel[1].label) || `Example ${i + 1}`);
    return `<button type="button" role="tab" aria-selected="${i === 0}" data-tab="${i}">${label}</button>`;
  });
  const bodies = await Promise.all(
    panels.map(
      async (panel, i) =>
        `<div role="tabpanel" data-tab="${i}"${i ? " hidden" : ""}>${await state.one(panel, state)}</div>`,
    ),
  );
  return `<div class="examples"><div class="tablist" role="tablist">${labels.join("")}</div>${bodies.join("")}</div>`;
};

const matrix: NodeHandler = async ([, , ...children], state) =>
  `<div class="matrix">${(await Promise.all(children.map((child) => state.one(child, state)))).join("")}</div>`;

// The index's studio: the agent's draft of the Markdown typed out a line at a time beside the page the plugins render,
// each block appearing once its lines are typed. Then the plugins' first issue on the draft, the one value the fixed
// Markdown changes, and the fixed block drawn. It rests on the fixed Markdown and page with the issue it fixed, and the
// script plays it while the pointer is on it or on Play; without the script, or with reduced motion, it only rests.
const hero: NodeHandler = async ([, , ...children], state) => {
  const [draftPre, pre] = children.filter(isPre);
  if (!draftPre || !pre)
    throw new Error(
      "The hero needs two fenced code blocks: the agent's draft, then the fixed Markdown.",
    );
  const intro = children.filter((child) => !isPre(child));
  const [draft, source] = [draftPre, pre].map((block) => textContent(block).trimEnd());
  const page = await parseMarkdown(source, { plugins: contentPlugins() });
  if (page.meta.issues.length) throw new Error(`The hero:\n${page.meta.issues.join("\n")}`);
  const [issue] = (await parseMarkdown(draft, { plugins: contentPlugins() })).meta.issues;
  if (!issue) throw new Error("The hero's draft needs a problem for the plugins to report.");
  const lines = source.split("\n");
  const draftLines = draft.split("\n");
  const changed = lines.flatMap((line, i) => (line === draftLines[i] ? [] : [i]));
  if (lines.length !== draftLines.length || changed.length !== 1)
    throw new Error("The hero's draft and fixed Markdown must differ in exactly one line.");
  // The value the fix changes, widened to the whole word, number, or quoted string around it.
  const at = changed[0];
  const [wrong, right] = [draftLines[at], lines[at]];
  let start = 0;
  while (wrong[start] === right[start]) start++;
  let end = 0;
  while (
    end < Math.min(wrong.length, right.length) - start &&
    wrong.at(-1 - end) === right.at(-1 - end)
  )
    end++;
  while (start > 0 && /[\w.-]/.test(right[start - 1])) start--;
  while (end > 0 && /[\w.-]/.test(right.at(-end)!)) end--;
  const was = wrong.slice(start, wrong.length - end);
  const is = right.slice(start, right.length - end);
  // The annotation the fix is in, so its mark waits for it.
  const fixed = lines.slice(0, at + 1).filter((line) => /^:+annotation\b/.test(line)).length;
  // Each top-level block ends where the Markdown at the top level next has a blank line, or closes its `::`.
  const ends: number[] = [];
  let depth = 0;
  let open = false;
  for (const [i, line] of lines.entries()) {
    if (depth === 0 && line.trim() && !open) open = true;
    const fence = /^(:{2,})([\w-]*)/.exec(line);
    if (fence?.[2]) depth++;
    else if (fence) depth--;
    if (depth === 0 && open && (!lines[i + 1]?.trim() || (fence && !fence[2]))) {
      ends.push(i);
      open = false;
    }
  }
  const nodes = page.nodes.filter(isElement);
  if (nodes.length !== ends.length)
    throw new Error(`The hero renders ${nodes.length} blocks from ${ends.length} in its Markdown.`);
  // When each line starts typing and how long it takes, as many steps as it has characters, all in about two seconds.
  const perChar = Math.min(16, 2200 / draft.length);
  const timing: { at: number; t: number }[] = [];
  let clock = 0;
  for (const line of draftLines) {
    timing.push({ at: Math.round(clock), t: Math.round(line.length * perChar) });
    clock += line.length * perChar + 40;
  }
  const typed = Math.round(clock);
  const done = (line: number) => timing[line].at + timing[line].t;
  let line = 0;
  const code = highlight(source)
    .replace(/<\/span>\n<span class="line">/g, '</span><span class="line">')
    .replace(/<span class="line">/g, () => {
      const i = line++;
      const flag = i === at ? " data-fix" : "";
      return `<span class="line"${flag} style="--n:${Math.max(draftLines[i].length, 1)};--t:${timing[i].t}ms;--at:${timing[i].at}ms">`;
    });
  const lineHtml = code.split('<span class="line"')[at + 1];
  const swap = lineHtml.replace(
    escapeHtml(is),
    `<span class="studio-fix"><del>${escapeHtml(was)}</del><ins style="--n:${is.length}">${escapeHtml(is)}</ins></span>`,
  );
  if (swap === lineHtml)
    throw new Error(`The hero's fix, "${is}", isn't one token in its highlighted line.`);
  const highlighted = code.replace(lineHtml, swap);
  // The draft's box for the fixed annotation, dashed where the draft put it, so the fix moves it into place.
  const box = Object.fromEntries(
    [...wrong.matchAll(/\b([xywh])=([\d.]+)/g)].map(([, key, value]) => [key, Number(value)]),
  );
  const fixedBox = Object.fromEntries(
    [...right.matchAll(/\b([xywh])=([\d.]+)/g)].map(([, key, value]) => [key, Number(value)]),
  );
  const ghost = ["x", "y", "w", "h"].every((key) => key in box && key in fixedBox)
    ? `<span class="studio-ghost" aria-hidden="true" style="--x:${box.x}%;--y:${box.y}%;--w:${box.w}%;--h:${box.h}%;--to-x:${fixedBox.x}%;--to-y:${fixedBox.y}%;--to-w:${fixedBox.w}%;--to-h:${fixedBox.h}%"></span>`
    : "";
  // Annotation n's mark and note show once its lines are typed: the line that opens the next block or closes this one.
  const annotationEnds = lines.flatMap((text, i) => {
    if (!/^:+annotation\b/.test(text)) return [];
    let close = i + 1;
    while (close < lines.length && !/^:+$/.test(lines[close])) close++;
    return [done(Math.min(close, lines.length - 1))];
  });
  const blocks = await Promise.all(
    nodes.map(async (node, i) => {
      let html = await state.one(node, state);
      html = html.replace(
        /(<(?:span|li)\b[^>]*?) data-n="(\d+)"/g,
        (match, tag: string, n: string) => {
          const shown = annotationEnds[Number(n) - 1] ?? 0;
          return `${tag} data-n="${n}"${Number(n) === fixed ? " data-fixed" : ""} data-at="${Math.round(shown)}"`;
        },
      );
      if (ghost && html.includes('<span class="ca-mark'))
        html = html.replace('<span class="ca-mark', `${ghost}<span class="ca-mark`);
      return `<div class="studio-block" style="--at:${done(ends[i])}ms">${html}</div>`;
    }),
  );
  const gutter = lines
    .map((_, i) => `<span${i === at ? " data-fix" : ""}>${i + 1}</span>`)
    .join("");
  const steps = ["Write", "Check", "Fix", "Render"];
  return (
    `<section class="showcase"><div class="split">${await state.flow(["div", {}, ...intro], state)}</div>` +
    `<div class="studio" style="--typed:${typed}ms"><div class="studio-bar">` +
    `<span class="studio-file">${siteIcon("file-input", 13)}review.md</span>` +
    `<ol class="studio-steps" aria-label="Steps">${steps.map((step) => `<li data-step="${step.toLowerCase()}">${step}</li>`).join("")}</ol>` +
    `<button type="button" class="studio-replay" hidden>${resetIcon}<span>Play</span></button>` +
    `<a class="window-play" href="${escapeHtml(playLink(source))}">${siteIcon("flask-conical", 13)}<span>Open in playground</span></a></div>` +
    `<div class="studio-body"><div class="studio-source"><div class="studio-code"><div class="studio-gutter" aria-hidden="true">${gutter}</div>${highlighted}</div>` +
    `<div class="studio-problems"><p class="studio-issue" aria-hidden="true"><span class="studio-dot" aria-hidden="true"></span><span><span class="studio-fixed">Fixed</span><strong>${escapeHtml(issue.slice(0, issue.indexOf(": ") + 1))}</strong>${escapeHtml(issue.slice(issue.indexOf(": ") + 1))}</span></p>` +
    `<p class="studio-ok">${checkIcon}No problems</p></div></div>` +
    `<div class="studio-page"><div>${blocks.join("")}</div></div></div></div></section>`
  );
};

const toc = (document: { nodes: Node[] }) =>
  document.nodes
    .filter(isElement)
    .filter(([tag]) => tag === "h2" || tag === "h3")
    .map(
      ([tag, attrs, ...children]) =>
        `<a class="nav-${tag}" href="#${str(attrs.id)}">${escapeHtml(textContent([tag, attrs, ...children]))}</a>`,
    )
    .join("");

async function parsePage(slug: string, section: Section) {
  const file = fileOf(slug);
  const document = await parseMarkdown(await readFile(new URL(file, repo), "utf8"), { plugins });
  if (document.meta.issues.length) throw new Error(`${file}:\n${document.meta.issues.join("\n")}`);
  // A rule page is named by its rule, and the catalog says what it asks for.
  const rule = doctorRule(slug);
  if (rule && Object.keys(document.frontmatter).length)
    throw new Error(
      `${file} takes its title from the rule's catalog entry; remove its frontmatter.`,
    );
  const [title, description, tagline, install, headline, label] = [
    "title",
    "description",
    "tagline",
    "install",
    "headline",
    "label",
  ].map((key) => str(document.frontmatter[key]));
  const pkg = packageOf(slug);
  if (pkg && pkg.slug !== "lint" && install)
    throw new Error(
      `${file}: a block's page has no installer; Getting started installs comark-ui, and the page's Package section installs it alone.`,
    );
  return {
    slug,
    section,
    document,
    rule,
    title: rule?.rule ?? title,
    description: rule ? plain(rule.title) : description,
    tagline: rule ? plain(rule.title) : tagline || description,
    install,
    headline,
    pkg,
    // Words that find the page in search that it doesn't say itself, such as other tools' names for its blocks.
    keywords: [document.frontmatter.keywords].flat().map(str).filter(Boolean).join(", "),
    label: rule?.name ?? (label || title),
    toc: toc(document),
  };
}
const parsed = await Promise.all(
  sections.flatMap((section) =>
    section.lists.flatMap((list) => list.slugs.map((slug) => parsePage(slug, section))),
  ),
);
const landing = await parsePage("", sections[0]);
type Page = (typeof parsed)[number];
const pagesOf = (section: Section) =>
  section.lists.map((list) => ({
    ...list,
    pages: list.slugs.flatMap((slug) => parsed.filter((page) => page.slug === slug)),
  }));

// Every example on the site, in one list from docs/examples.ts: the playground lists the ones it can run, a
// package's column shows its own, and the landing's canvas draws a card for each.
const examples = await loadExamples(packageOrder);
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const pageOf = (slug: string) => parsed.find((page) => page.slug === slug)!;
const presets = examples
  .filter((example) => example.playable)
  .map(({ id, label, group, source }) => {
    const pkg = packages.find((pkg) => pkg.slug === group);
    return { id, label, group: pkg?.label ?? "Recipes", npm: pkg?.npm ?? "", source };
  });
// The size of each PNG the pages show, read from its header, so a still reserves its room before the image loads.
const publicDir = new URL("public/", root);
const imageSizes = new Map(
  await Promise.all(
    (await readdir(publicDir))
      .filter((file) => file.endsWith(".png"))
      .map(async (file) => {
        const head = await readFile(new URL(file, publicDir));
        return [file, [head.readUInt32BE(16), head.readUInt32BE(20)]] as const;
      }),
  ),
);
// A still of a rendered document: no scripts, its plugins' styles collected into `styles` to go in the page once,
// no ids, since a page holds many, and a chart without its data table, so the still is all plot. Nothing in it zooms
// or takes focus, so the page's zoom never adds a still to a gallery or a group.
const stillOf = (html: string, styles: Set<string>) =>
  html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (style) => (styles.add(style), ""))
    .replace(/<script>[\s\S]*?<\/script>/g, "")
    .replace(/<details class="cch-data">[\s\S]*?<\/details>/g, "")
    .replace(/\s(id|for|aria-controls|aria-labelledby|tabindex|data-zoom[\w-]*)="[^"]*"/g, "")
    .replace(/(<[a-z][^>]*?)\sdata-zoom(?=[\s>])/g, "$1")
    .replace(/<img\b([^>]*?) src="\/([\w-]+\.png)"/g, (tag, rest: string, file: string) => {
      const size = imageSizes.get(file);
      return size && !/\swidth=/.test(rest) ? `${tag} width="${size[0]}" height="${size[1]}"` : tag;
    })
    .replace(/<img\b/g, '<img loading="lazy" draggable="false"');
// A small still of each preset for the playground's column, with a gray box for each player, so the column
// loads nothing but the pages' own images. The playground scales each still to its card.
const thumbnailStyles = new Set<string>();
const thumbnails = new Map(
  await Promise.all(
    presets.map(async (preset) => {
      const document = await parseMarkdown(preset.source, { plugins: sitePlugins() });
      const html = (await renderHtmlFromDocument(document, { components })).replace(
        /<iframe\b[^>]*><\/iframe>|<(video|audio) class="cm"[^>]*>.*?<\/\1>|<span class="cm cm-(?:audio|video)"[^>]*>.*?<\/button><\/span><\/span>/g,
        `<span class="preset-player">${siteIcon("tv-minimal-play", 128)}</span>`,
      );
      return [preset.id, stillOf(html, thumbnailStyles)] as const;
    }),
  ),
);

const playIcon = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14"/></svg>`;
const canvasIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`;
const listIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/></svg>`;

// What lint-comark prints for a demo's Markdown, a line at a time, as its command line would.
// What lint-comark prints for a file, drawn as a terminal. With `fixes`, each problem's fix follows its message.
function terminal(file: string, found: Diagnostic[], fixes = false) {
  const lines = [
    `<span class="term-cmd"><span aria-hidden="true">$</span> lint-comark ${file}</span>`,
    ...found.flatMap((d) => [
      `<span class="term-where">${file}:${d.line}:${d.column ?? 1} <span>${escapeHtml(d.rule)}</span></span>`,
      `<span class="term-message">${inlineCode(d.message)}</span>`,
      ...(fixes ? [`<span class="term-fix">${inlineCode(d.fix)}</span>`] : []),
    ]),
    found.length
      ? `<span class="term-sum">✖ ${found.length} problem${found.length === 1 ? "" : "s"}</span>`
      : `<span class="term-ok">✔ No problems</span>`,
  ];
  return `<div class="term">${lines.map((line, i) => `<span class="term-line" style="--i:${i}">${line}</span>`).join("")}</div>`;
}
async function lintReport(source: string) {
  const found = await lint(source, { plugins: browserPlugins(), components });
  if (!found.length) throw new Error("The lint demo's Markdown needs a problem to report.");
  return terminal("review.md", found);
}
// A rule page's examples: Markdown the rule reports, with what lint-comark prints for it, and the same Markdown fixed.
// test/doctor.test.ts checks them the same way, so the build fails only on a page the tests let through.
const ruleExample =
  (page: Page, kind: "incorrect" | "correct"): NodeHandler =>
  async ([, , ...children], state) => {
    const pre = children.find(isPre);
    const { rule } = page;
    if (!rule) throw new Error(`${fileOf(page.slug)}: ::${kind} goes only on a Doctor rule page.`);
    const { found, problem } = await checkExample(rule.rule, kind, pre ? textContent(pre) : "");
    if (problem || !pre) throw new Error(`${fileOf(page.slug)}: ${problem}`);
    const label = kind === "correct" ? "Correct" : "Incorrect";
    return (
      `<div class="rule-example rule-${kind}"><p class="rule-verdict">${siteIcon(kind === "correct" ? "circle-check" : "circle-x", 15)}${label}</p>` +
      `${await state.one(pre, state)}${terminal("example.md", found, true)}</div>`
    );
  };
// The Doctor overview's table of every rule, with its code and severity.
const ruleTable: NodeHandler = () =>
  `<div class="table-scroll"><table><thead><tr><th>Code</th><th>Rule</th><th>What it asks</th><th>Severity</th></tr></thead><tbody>${doctorRules
    .map(
      (entry) =>
        `<tr><td><code>${entry.code}</code></td><td><a href="${href(entry.slug)}"><code>${escapeHtml(entry.rule)}</code></a></td><td>${inlineCode(entry.title)}</td><td>${entry.severity ?? "warning"}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
const demoStyles = new Set<string>();
async function renderDemo(slug: string, source: string) {
  if (slug === "lint") return lintReport(source);
  const document = await parseMarkdown(source, { plugins: contentPlugins() });
  if (document.meta.issues.length)
    throw new Error(`The ${slug} demo:\n${document.meta.issues.join("\n")}`);
  let html = (await renderHtmlFromDocument(document, { components })).replace(
    /<iframe\b[^>]*><\/iframe>/g,
    `<span class="demo-player"><span class="demo-play">${playIcon}</span></span>`,
  );
  // Tabs show their strip, code blocks their buttons, and players their controls, once their script runs, which a card
  // doesn't have. A video there drops the browser's controls, which would otherwise show over its own.
  html = html
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
  return stillOf(html, demoStyles);
}
interface Demo {
  /** The example's id, the same as its playground preset's. */
  id: string;
  pkg: Pick<Package, "slug" | "label" | "icon" | "npm">;
  /** The page the card opens. */
  page: string;
  label: string;
  source: string;
}
// A card is titled as the rail titles its page, so the canvas and the docs name a block alike; its copy button gives the
// package.
async function demoCard({ id, pkg, page, label, source }: Demo) {
  const still = await renderDemo(pkg.slug, source);
  return (
    `<article class="demo demo-${slugify(pkg.slug)}" data-package="${pkg.slug}" data-example="${id}">` +
    `<a class="demo-link" href="${href(page)}" draggable="false" tabindex="-1">${siteIcon(pkg.icon, 15)}<strong>${escapeHtml(pkg.label)}</strong>${label ? `<span>${escapeHtml(label.toLowerCase())}</span>` : ""}</a>` +
    `<button type="button" class="demo-copy" data-copy="pnpm add ${escapeHtml(pkg.npm!)}" tabindex="-1" title="Copy pnpm add ${escapeHtml(pkg.npm!)}" aria-label="Copy pnpm add ${escapeHtml(pkg.npm!)}">${copyIcon}${checkIcon}</button>` +
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

// The index's packages, twice over: a canvas with a card for every example, drawn by the plugins as the playground
// draws it, and the list it replaces without the script, for keyboards, and on request. A `demo` in the block adds a
// card for a package with no examples, such as lint's report.
const packageGrid: NodeHandler = async ([, , ...children]) => {
  const extra: Demo[] = children.filter(isElement).map(([, attrs, ...content]) => {
    const pkg = packages.find((pkg) => pkg.slug === str(attrs.package));
    if (!pkg) throw new Error(`A demo names no package: "${str(attrs.package)}".`);
    const pre = content.find(isPre);
    if (!pre) throw new Error(`The ${pkg.slug} demo needs a fenced code block.`);
    return { id: pkg.slug, pkg, page: pkg.slug, label: str(attrs.label), source: textContent(pre) };
  });
  const cards: Demo[] = examples.map((example) => {
    const pkg = packages.find((pkg) => pkg.slug === example.group);
    if (pkg)
      return {
        id: example.id,
        pkg,
        page: example.page,
        label: example.label,
        source: example.source,
      };
    // A recipe links to its page and copies its install command.
    const recipe = pageOf(example.page);
    return {
      id: example.id,
      pkg: {
        slug: recipe.slug,
        label: "recipe",
        icon: "book-open",
        npm: recipe.install.replace(/^pnpm add /, ""),
      },
      page: recipe.slug,
      label: recipe.slug.slice("recipes/".length),
      source: example.source,
    };
  });
  const demos = await Promise.all(deal([...cards, ...extra]).map(demoCard));
  const list = packages
    .map(
      (pkg) =>
        `<li><a href="${href(pkg.slug)}"><span class="grid-icon">${siteIcon(pkg.icon, 20)}</span><strong>${escapeHtml(pkg.label)}</strong><span>${escapeHtml(pkg.blurb)}</span><span class="grid-arrow">${siteIcon("arrow-up-right", 16)}</span></a></li>`,
    )
    .join("");
  return (
    `<section class="canvas" data-view="list" aria-label="Packages">${[...demoStyles].join("")}` +
    `<div class="canvas-viewport" aria-hidden="true"><div class="canvas-dots"></div><div class="canvas-stage"></div><p class="canvas-hint">Drag to explore</p></div>` +
    `<template class="canvas-cards">${demos.join("")}</template>` +
    `<ul class="grid">${list}</ul>` +
    `<div class="canvas-bar" hidden><div class="seg" role="group" aria-label="View"><button type="button" data-view="canvas" aria-pressed="false" aria-label="Canvas" title="Canvas">${canvasIcon}</button><button type="button" data-view="list" aria-pressed="true" aria-label="List" title="List">${listIcon}</button></div>` +
    `</div>` +
    // Before the first paint, so the list doesn't flash before the canvas.
    `<script>{const c=document.currentScript.parentElement;let v;try{v=localStorage.getItem("comark-view")}catch{}c.dataset.view=v==="list"?"list":"canvas"}</script></section>`
  );
};

// The index's band for Drop: its pitch, and the list in it as numbered steps beside it.
const drop: NodeHandler = async ([, , ...children], state) => {
  const steps = children.filter((child) => isElement(child) && child[0] === "ol");
  const pitch = children.filter((child) => !steps.includes(child));
  return (
    `<section class="drop"><div class="drop-pitch"><img src="/drop.svg" alt="" width="36" height="36">${await state.flow(["div", {}, ...pitch], state)}` +
    `<div class="actions"><a class="button primary" href="https://drop.vitehub.dev">Try Drop${siteIcon("arrow-up-right", 15)}</a><a class="button" href="/recipes/share/">Read the recipe</a></div></div>` +
    `${(await Promise.all(steps.map((step) => state.one(step, state)))).join("")}</section>`
  );
};

const github = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
const starIcon = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`;
// The repository's stars, read once per build. Offline or rate-limited, the button just says GitHub.
const stars = await fetch("https://api.github.com/repos/onmax/comark-ui", {
  headers: { accept: "application/vnd.github+json" },
  signal: AbortSignal.timeout(5000),
})
  .then((response) =>
    response.ok
      ? // SAFETY: GitHub's repository endpoint answers with an object that has stargazers_count.
        (response.json() as Promise<{ stargazers_count?: number }>)
      : undefined,
  )
  .then((repo) => repo?.stargazers_count)
  .catch(() => undefined);
// GitHub, as on drop.vitehub.dev, with the stars after a divider.
const githubLink = `<a class="github" href="https://github.com/onmax/comark-ui" aria-label="comark-ui on GitHub${stars === undefined ? "" : `, ${stars} stars`}">${github}<span class="github-label">GitHub</span>${stars === undefined ? "" : `<span class="github-stars">${starIcon}${new Intl.NumberFormat("en", { notation: "compact" }).format(stars)}</span>`}</a>`;
const userIcon = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg>`;
const botIcon = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M15 13v2M9 13v2"/></svg>`;
const copyIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const resetIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
const checkIcon = `<svg class="check" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5"/></svg>`;
// Humans install the packages with their package manager; agents install the comark-ui skill.
function installerFor(install: string) {
  const packages = install.replace(/^pnpm add /, "");
  const commands = {
    pnpm: `pnpm add ${packages}`,
    npm: `npm install ${packages}`,
    yarn: `yarn add ${packages}`,
    bun: `bun add ${packages}`,
    agents: "npx skills add onmax/comark-ui",
  };
  return `<div class="installer" data-commands='${escapeHtml(JSON.stringify(commands))}'>
<div class="installer-bar"><div class="seg" role="group" aria-label="Audience"><button type="button" data-audience="humans" aria-pressed="true">${userIcon}For humans</button><button type="button" data-audience="agents" aria-pressed="false">${botIcon}For agents</button></div>
<div class="seg installer-pm" role="group" aria-label="Package manager">${["pnpm", "npm", "yarn", "bun"].map((pm, i) => `<button type="button" data-pm="${pm}" aria-pressed="${i === 0}">${pm}</button>`).join("")}</div></div>
<button type="button" class="install" data-copy="${escapeHtml(commands.pnpm)}" aria-label="Copy the install command"><span aria-hidden="true">$</span><code>${escapeHtml(commands.pnpm)}</code><span class="install-hint">${copyIcon}${checkIcon}</span></button>
</div>`;
}

// The first column: one icon per section. Hovering or focusing it widens it over the second column to show every
// section's name, as on vitehub.dev. The current section's is marked. Drop sits at the bottom: it renders the
// review documents these plugins make, and it's by the same author.
const rail = (current: Section) =>
  `<nav class="rail" aria-label="Sections">${sections
    .map(
      (section) =>
        `${section.slug === "play" ? "<hr>" : ""}<a href="${href(section.lists[0]?.slugs[0] ?? section.slug)}"${section === current ? ' aria-current="true"' : ""}>${siteIcon(section.icon)}<span class="rail-label">${escapeHtml(section.label)}</span></a>`,
    )
    .join(
      "",
    )}<a class="rail-drop" href="https://drop.vitehub.dev/?utm_source=comark-ui&amp;utm_medium=sidebar"><img src="/drop.svg" alt="" width="18" height="18"><span class="rail-label"><strong>Review on Drop</strong><span>Comment on the exact spot</span></span></a></nav>`;
// The second column: the current section's pages, or the playground's presets.
const column = (section: Section, current: string) => {
  const presetCard = (preset: (typeof presets)[number], href: string) =>
    `<div class="preset"><div class="preset-thumb" aria-hidden="true" inert><div class="preset-page">${thumbnails.get(preset.id) ?? ""}</div></div><a data-preset="${preset.id}" href="${href}">${escapeHtml(preset.label)}</a></div>`;
  const lists =
    section.slug === "play"
      ? [...new Set(presets.map((preset) => preset.group))].map((group) => ({
          title: group,
          icon: packages.find((pkg) => pkg.label === group)?.icon,
          links: [
            `<div class="presets">${presets
              .filter((preset) => preset.group === group)
              .map((preset) => presetCard(preset, `#preset=${preset.id}`))
              .join("")}</div>`,
          ],
        }))
      : pagesOf(section).map((list) => ({
          title: list.title,
          icon: list.icon,
          links: list.pages.map(
            (page) =>
              `<a${page.slug.includes("/components/") ? ' class="nav-sub"' : ""}${page.slug === current ? ' aria-current="page"' : ""} href="${href(page.slug)}">${escapeHtml(page.label)}</a>`,
          ),
        }));
  return `<nav class="pages" aria-label="${escapeHtml(section.label)}"><p class="pages-title">${escapeHtml(section.label)}</p>${lists
    .map(
      (list) =>
        `${list.title ? `<p class="nav-group">${list.icon ? siteIcon(list.icon, 14) : ""}${escapeHtml(list.title)}</p>` : ""}${list.links.join("")}`,
    )
    .join("")}</nav>`;
};
// Brings the current page's link into the column's view before the first paint, for a page low in a long column. The
// app runs it again after a navigation, unless a saved history position has already been restored.
const revealCurrent = `<script>{const c=document.currentScript.previousElementSibling.querySelector(".pages"),a=c&&c.querySelector("[aria-current=page]");if(a&&!c.hasAttribute("data-sidebar-restored")){const b=c.getBoundingClientRect(),l=a.getBoundingClientRect();if(l.top<b.top||l.bottom>b.bottom)c.scrollTop+=l.top-b.top-(b.height-l.height)/2}}</script>`;
// Previous and next page in the section.
function pager(page: Page) {
  const list = pagesOf(page.section).flatMap((list) => list.pages);
  const i = list.indexOf(page);
  const [previous, next] = [list[i - 1], list[i + 1]];
  if (!previous && !next) return "";
  const link = (target: Page | undefined, rel: string, arrow: string) =>
    target
      ? `<a class="pager-${rel}" rel="${rel}" href="${href(target.slug)}"><small>${rel === "prev" ? "Previous" : "Next"}</small><span>${rel === "prev" ? siteIcon(arrow, 14) : ""}${escapeHtml(target.label)}${rel === "next" ? siteIcon(arrow, 14) : ""}</span></a>`
      : "<span></span>";
  return `<nav class="pager" aria-label="Pages">${link(previous, "prev", "arrow-left")}${link(next, "next", "arrow-right")}</nav>`;
}

const npmx = `<svg viewBox="0 0 153 153" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.6 107.2h24.1v23.7h-24zM119.8.8 116.2 11 69.9 142l-3.6 10.2h15.5l3.6-10.2 11.7-33.2L135.4.8z"/></svg>`;
// npmx shows a page's package, or every package of the project on a page about all of them.
const npmxLink = (npm?: string) =>
  `<a class="npmx" href="https://npmx.dev/${npm ? `package/${npm}` : "~onmax_"}" title="${npm ? `${npm} on npmx` : "Every package on npmx"}">${npmx}<span>${npm || "npmx"}</span></a>`;
// Markdown's # in a hand-drawn loop, the mark comark-annotate draws around what a reviewer should look at.
const logo = `<svg class="logo" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true"><rect stroke="currentColor" x="6.5" y="11.4" width="19" height="10.2" fill="none" stroke-width="1.3"/><path fill="currentColor" d="M7.87 20.24V12.76H10.07L12.26 15.51 14.46 12.76H16.66V20.24H14.46V15.95L12.26 18.7 10.07 15.95V20.24ZM18.64 12.98h2.19v2.12h-2.19ZM18.64 17.9h2.19v2.12h-2.19ZM21.94 12.98h2.19v2.12h-2.19ZM21.94 17.9h2.19v2.12h-2.19Z"/><path d="M9.3 7.3C15.3 3.7 27.1 4.5 28.7 11.5 30.4 19.1 22 26.7 12.8 27.2 5.9 27.6 2 23.5 3.5 18.1 4.8 13.3 11.1 9.7 18.1 9.6" fill="none" stroke="#e5484d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const menuIcon = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>`;

// The example tabs, the Preview/Code switch, the install command's copy button, and the active sidebar link. Without it the page still reads top to bottom.
// A block, so the docs app can run it again for each page it navigates to.
const script = `{
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
// One indicator per tab row or switch slides to the chosen item, however it gets chosen. A hidden row measures zero,
// so it's placed again, without sliding, whenever its size changes.
const indicate = (group, selector) => {
  const bar = group.appendChild(Object.assign(document.createElement("span"), { className: "indicator" }));
  bar.setAttribute("aria-hidden", "true");
  const place = () => { const b = group.querySelector(selector); if (b) { bar.style.width = b.offsetWidth + "px"; bar.style.transform = "translateX(" + b.offsetLeft + "px)" } };
  new ResizeObserver(() => {
    bar.dataset.still = ""; place(); requestAnimationFrame(() => delete bar.dataset.still);
    group.toggleAttribute("data-overflow", group.scrollWidth > group.clientWidth + 1);
  }).observe(group);
  new MutationObserver(place).observe(group, { subtree: true, attributeFilter: ["aria-pressed", "aria-selected"] });
  group.dataset.indicator = "";
};
const reveal = el => { if (!reduce.matches) el.animate({ opacity: [0, 1] }, { duration: 200, easing: "ease-out" }) };
for (const t of document.querySelectorAll(".examples")) {
  const row = t.querySelector(".tablist");
  indicate(row, "[aria-selected=true]");
  row.addEventListener("click", e => {
    const b = e.target.closest("[role=tab]"); if (!b || b.getAttribute("aria-selected") === "true") return;
    for (const x of t.querySelectorAll(":scope > .tablist > [role=tab]")) x.setAttribute("aria-selected", x === b);
    for (const p of t.querySelectorAll(":scope > [role=tabpanel]")) { p.hidden = p.dataset.tab !== b.dataset.tab; if (!p.hidden) reveal(p) }
  });
}
for (const seg of document.querySelectorAll(".seg")) indicate(seg, "[aria-pressed=true]");
for (const ex of document.querySelectorAll(".example")) ex.querySelector(".seg").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.getAttribute("aria-pressed") === "true") return;
  for (const x of ex.querySelectorAll(".seg button")) x.setAttribute("aria-pressed", x === b);
  for (const view of ["preview", "code"]) { const p = ex.querySelector(".example-" + view); p.hidden = b.dataset.view !== view; if (!p.hidden) reveal(p) }
});
for (const box of document.querySelectorAll(".installer")) {
  const commands = JSON.parse(box.dataset.commands); const field = box.querySelector(".install"); let audience = "humans", pm = "pnpm";
  const update = () => { const cmd = audience === "agents" ? commands.agents : commands[pm]; field.dataset.copy = cmd; field.querySelector("code").textContent = cmd; box.querySelector(".installer-pm").hidden = audience === "agents"; for (const b of box.querySelectorAll("[data-audience]")) b.setAttribute("aria-pressed", b.dataset.audience === audience); for (const b of box.querySelectorAll("[data-pm]")) b.setAttribute("aria-pressed", b.dataset.pm === pm) };
  box.addEventListener("click", e => { const b = e.target.closest("[data-audience],[data-pm]"); if (!b) return; if (b.dataset.audience) audience = b.dataset.audience; if (b.dataset.pm) pm = b.dataset.pm; update() });
  field.addEventListener("click", async () => { await navigator.clipboard.writeText(field.dataset.copy); field.classList.add("copied"); setTimeout(() => field.classList.remove("copied"), 1200) });
}
const copyTokens = new WeakMap();
const copied = async button => {
  const token = (copyTokens.get(button) ?? 0) + 1;
  copyTokens.set(button, token);
  await navigator.clipboard.writeText(button.dataset.copy);
  if (copyTokens.get(button) !== token) return;
  button.classList.add("copied");
  setTimeout(() => {
    if (copyTokens.get(button) === token) button.classList.remove("copied");
  }, 1200);
};
// The index's canvas: columns of package cards without end, each running through every card from its own start, so
// neighbours differ from column to column. Only the cards in view are in the page, cloned from the template as they
// come in, at heights known before any is shown. It holds still: it follows a drag and coasts to rest after it, and
// pans sideways with a trackpad.
const mod = (a, n) => ((a % n) + n) % n;
for (const canvas of document.querySelectorAll(".canvas")) {
  const viewport = canvas.querySelector(".canvas-viewport"), stage = canvas.querySelector(".canvas-stage"), dots = canvas.querySelector(".canvas-dots");
  const list = canvas.querySelector(".grid");
  const cards = [...canvas.querySelector(".canvas-cards").content.children];
  const n = cards.length, gap = 20, pitch = 300 + gap, pad = 160;
  let heights = [], period = 0;
  // A card without a height in its markup is measured off screen at the canvas's first draw, once per visit, so
  // coming back to the page measures nothing. Its images carry their size, so it measures as it will show.
  const measured = window.comarkCardHeights ??= [];
  const measure = () => {
    const probe = document.createElement("div");
    probe.className = "canvas-probe";
    const unsized = cards.flatMap((c, i) => c.dataset.h || measured[i] ? [] : [i]);
    const clones = unsized.map(i => probe.appendChild(cards[i].cloneNode(true)));
    stage.append(probe);
    unsized.forEach((i, j) => measured[i] = Math.ceil(clones[j].getBoundingClientRect().height));
    probe.remove();
    // A card taller than the tallest the canvas shows is cut, and fades out where it's cut.
    cards.forEach((card, i) => {
      if (card.dataset.h) return;
      card.dataset.h = Math.min(420, Math.max(120, measured[i])); card.style.height = card.dataset.h + "px";
      card.toggleAttribute("data-cut", measured[i] > 420);
    });
    heights = cards.map(c => Number(c.dataset.h));
    period = heights.reduce((sum, h) => sum + h + gap, 0);
  };
  // Each column starts \`step\` cards on from the one before, so a card shows again in the columns k over, k*step cards
  // away. The step that keeps those farthest apart over the columns a screen holds keeps copies off one screen.
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const apart = s => Math.min(...[1, 2, 3, 4, 5, 6].map(k => { const d = mod(k * s, n); return Math.min(d, n - d) }));
  let step = 1;
  for (let s = 2; s < n; s++) if (gcd(s, n) === 1 && apart(s) > apart(step)) step = s;
  const live = new Map(), pools = cards.map(() => []);
  let x = 0, y = -48, vw = 0, vh = 0, vx = 0, vy = 0, last = 0, frame = 0, down, dragging = false, moved = false, samples = [];
  let placed = false;
  const draw = () => {
    if (!vw) return;
    if (!period) measure();
    // Centered on the first column, once there's a width to center in.
    if (!placed && vw) { x = -mod(vw - 300, pitch) / 2; placed = true }
    stage.style.transform = "translate3d(" + -x + "px," + -y + "px,0)";
    dots.style.transform = "translate3d(" + -mod(x, 24) + "px," + -mod(y, 24) + "px,0)";
    const seen = new Set();
    for (let c = Math.floor((x - pad) / pitch); c * pitch < x + vw + pad; c++) {
      const start = mod(c * step, n), shift = mod(c, 2) * 140 + mod(c, 3) * 36;
      let top = shift;
      const ys = cards.map((_, j) => { const at = top; top += heights[(start + j) % n] + gap; return at });
      for (let p = Math.floor((y - pad - shift) / period); p * period + shift < y + vh + pad; p++)
        for (let j = 0; j < n; j++) {
          const i = (start + j) % n, at = p * period + ys[j];
          if (at >= y + vh + pad || at + heights[i] <= y - pad) continue;
          const key = c + ":" + (p * n + j);
          seen.add(key);
          if (live.has(key)) continue;
          const el = pools[i].pop() ?? cards[i].cloneNode(true);
          for (const button of el.querySelectorAll(".demo-copy")) {
            button.classList.remove("copied");
            copyTokens.set(button, (copyTokens.get(button) ?? 0) + 1);
          }
          el.style.left = c * pitch + "px"; el.style.top = at + "px";
          stage.append(el); live.set(key, { el, i });
        }
    }
    for (const [key, slot] of live) if (!seen.has(key)) { slot.el.remove(); pools[slot.i].push(slot.el); live.delete(key) }
  };
  // A fling's velocity eases to rest, and the loop stops there.
  const tick = now => {
    const dt = Math.min(64, now - (last || now)); last = now;
    const k = 1 - Math.exp(-dt / 450);
    vx -= vx * k; vy -= vy * k;
    x += vx * dt; y += vy * dt; draw();
    if (Math.abs(vx) + Math.abs(vy) < 0.003) { vx = vy = 0; frame = last = 0; return }
    frame = requestAnimationFrame(tick);
  };
  const run = () => { if (!frame && !dragging && (vx || vy) && canvas.dataset.view === "canvas") frame = requestAnimationFrame(tick) };
  const halt = () => { cancelAnimationFrame(frame); frame = last = 0 };
  const view = (name, keep) => {
    canvas.dataset.view = name;
    for (const b of canvas.querySelectorAll(".canvas-bar [data-view]")) b.setAttribute("aria-pressed", b.dataset.view === name);
    if (keep) try { localStorage.setItem("comark-view", name) } catch {}
    // Measure during view activation so navigation can draw with the viewport size before its first paint.
    if (name === "canvas") { vw = viewport.clientWidth; vh = viewport.clientHeight; draw(); run() } else halt();
  };
  new ResizeObserver(([e]) => { vw = e.contentRect.width; vh = e.contentRect.height; draw() }).observe(viewport);
  viewport.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.target.closest(".demo-copy")) return;
    down = { id: e.pointerId, px: e.clientX, py: e.clientY, x, y }; moved = false;
    samples = [[e.timeStamp, e.clientX, e.clientY]];
  });
  viewport.addEventListener("pointermove", e => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.px, dy = e.clientY - down.py;
    if (!dragging) {
      if (Math.hypot(dx, dy) < 5) return;
      dragging = moved = true; halt(); vx = vy = 0;
      viewport.setPointerCapture(e.pointerId); viewport.dataset.dragging = ""; canvas.dataset.dragged = "";
    }
    x = down.x - dx; y = down.y - dy; draw();
    samples.push([e.timeStamp, e.clientX, e.clientY]);
    if (samples.length > 8) samples.shift();
  });
  const release = e => {
    if (!down || e.pointerId !== down.id) return;
    if (dragging) {
      const [t, sx, sy] = samples.find(s => e.timeStamp - s[0] < 100) ?? samples.at(-1), dt = e.timeStamp - t;
      const fling = v => Math.max(-3, Math.min(3, v));
      if (e.type === "pointerup" && dt > 0 && !reduce.matches) { vx = fling((sx - e.clientX) / dt); vy = fling((sy - e.clientY) / dt) }
      dragging = false; delete viewport.dataset.dragging; run();
    }
    down = undefined;
  };
  viewport.addEventListener("pointerup", release);
  viewport.addEventListener("pointercancel", e => { release(e); moved = false });
  // A drag that ends on a card isn't a click on it.
  viewport.addEventListener("click", e => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return }
    const copy = e.target.closest(".demo-copy");
    if (copy) copied(copy);
  }, true);
  viewport.addEventListener("dragstart", e => e.preventDefault());
  viewport.addEventListener("selectstart", e => e.preventDefault());
  viewport.addEventListener("wheel", e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); x += e.deltaX * (e.deltaMode ? 16 : 1); canvas.dataset.dragged = ""; draw();
  }, { passive: false });
  canvas.querySelector(".canvas-bar").hidden = false;
  canvas.querySelector(".canvas-bar .seg").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (b) view(b.dataset.view, true) });
  // The canvas is for pointers; a keyboard reaching the list shows it.
  list.addEventListener("focusin", () => { if (canvas.dataset.view === "canvas") view("list") });
  view(canvas.dataset.view);
}
// The index's studio plays while the pointer is on it, or on Play: data-phase steps through writing, checking, fixing,
// and rendering, and the stylesheet animates each.
for (const studio of document.querySelectorAll(".studio")) {
  if (reduce.matches) continue;
  const typed = parseFloat(getComputedStyle(studio).getPropertyValue("--typed")), replay = studio.querySelector(".studio-replay");
  const steps = [...studio.querySelectorAll(".studio-steps li")], issue = studio.querySelector(".studio-issue"), ok = studio.querySelector(".studio-ok");
  for (const el of studio.querySelectorAll("[data-at]:not([data-fixed])")) el.style.setProperty("--at", el.dataset.at + "ms");
  let timers = [], playing = false;
  const phase = name => {
    studio.dataset.phase = name;
    // Only the line that shows is read out.
    issue.setAttribute("aria-hidden", name !== "check"); ok.setAttribute("aria-hidden", !["fix", "render"].includes(name));
    const i = steps.findIndex(li => li.dataset.step === name);
    for (const [j, li] of steps.entries()) { li.toggleAttribute("data-done", j < i); if (j === i) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current") }
  };
  const play = () => {
    for (const t of timers) clearTimeout(t);
    studio.dataset.phase = "waiting"; void studio.offsetWidth;
    phase("write");
    playing = true;
    timers = [[typed + 500, "check"], [typed + 2900, "fix"], [typed + 3700, "render"], [typed + 5200, ""]].map(([ms, name]) => setTimeout(() => name ? phase(name) : (playing = false), ms));
  };
  replay.hidden = false;
  replay.addEventListener("click", play);
  studio.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && !playing) play() });
}

const links = [...document.querySelectorAll(".toc a")];
const spy = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) for (const a of links) a.toggleAttribute("data-active", a.hash === "#" + e.target.id);
}, { rootMargin: "0px 0px -70% 0px" });
for (const h of document.querySelectorAll("main h2[id], main h3[id]")) spy.observe(h);
// Escape folds the widened rail back without moving focus; it widens again once the pointer or focus leaves it.
for (const rail of document.querySelectorAll(".sidebar .rail")) {
  rail.addEventListener("keydown", e => { if (e.key === "Escape") rail.dataset.dismissed = "" });
  rail.addEventListener("focusout", e => { if (!rail.contains(e.relatedTarget)) delete rail.dataset.dismissed });
  rail.addEventListener("pointerleave", () => delete rail.dataset.dismissed);
}
}`;

// Search over every page and its headings, from /search.json, fetched the first time it's needed. Without the
// script the buttons stay hidden. It listens on the document and finds the dialog when it's used, so it runs once even
// when the docs app swaps the page around it.
const searchScript = `
if (!window.comarkSearch) {
window.comarkSearch = true;
// On <html>, which the docs app leaves alone when it takes over the header.
document.documentElement.dataset.search = "";
if (/Mac|iP(hone|ad)/.test(navigator.platform)) document.documentElement.dataset.mac = "";
let index, results = [], active = 0, restoreMenuFocus = false;
// Words in lowercase, without accents or a plural s, so "Gantts" finds "gantt".
const wordRe = /[\\p{L}\\p{M}\\p{N}]+/gu;
const norm = w => { w = w.normalize("NFD").replace(/\\p{M}/gu, "").toLowerCase(); return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w };
const words = text => text?.match(wordRe)?.map(norm) ?? [];
// Words too common to narrow a search: left out of one unless they're all there is, and matched only as they are.
const common = new Set(["a", "an", "and", "are", "be", "by", "can", "do", "does", "for", "from", "how", "i", "if", "in", "is", "it", "its", "my", "of", "on", "or", "so", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "to", "what", "when", "with", "you", "your"]);
// What a word found in each field counts: the title, the page's keywords, where it sits, its description, and its text.
const fields = [["t", 10], ["w", 6], ["p", 3], ["d", 3], ["x", 1]];
// Each word in the index, with the entries and fields it's in.
const load = () => index ??= fetch("/search.json").then(r => r.json()).then(all => {
  const postings = new Map();
  all.forEach((e, i) => fields.forEach(([key], f) => { for (const w of new Set(words(e[key]))) { if (!postings.has(w)) postings.set(w, []); postings.get(w).push(i, f) } }));
  return { all, postings, titles: all.map(e => words(e.t)) };
});
// Edits between two words, a swap of neighbours counting as one, given up past max.
const distance = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before = [], prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], before[j - 2] + 1);
    }
    if (Math.min(...row) > max) return max + 1;
    before = prev; prev = row;
  }
  return prev[b.length];
};
// Endings that leave a word the same word, so "theme" finds "Theming" and "sorting" finds "sort".
const endings = new Set(["", "e", "ed", "er", "es", "ing", "ion", "ation", "ly"]);
// How well a typed word matches one in the index: the same word, the start of one, the same word with another ending,
// or one a typo or two away. A short word gets no typos, and neither does a first letter, since allowing them matches
// nearly everything.
const close = (q, w) => {
  if (w === q) return 1;
  if (common.has(q)) return 0;
  if (common.has(w)) return 0;
  if (w.startsWith(q)) return 0.6 + 0.3 * q.length / w.length;
  let same = 0;
  while (same < q.length && q[same] === w[same]) same++;
  if (same >= 4 && endings.has(q.slice(same)) && endings.has(w.slice(same))) return 0.7;
  const typos = q.length < 4 ? 0 : q.length < 8 ? 1 : 2;
  if (!typos || w[0] !== q[0]) return 0;
  if (distance(q, w, typos) <= typos) return 0.5;
  // A word still being typed, with a typo in it.
  return w.length > q.length && distance(q, w.slice(0, q.length), typos) <= typos ? 0.3 : 0;
};
const found = new Map();
const matches = (q, postings) => {
  if (!found.has(q)) {
    const m = new Map();
    for (const w of postings.keys()) { const c = close(q, w); if (c) m.set(w, c) }
    // A word the index has, or starts one, isn't a typo, so "video" doesn't find "Vimeo".
    if ([...m.values()].some(c => c >= 0.6)) for (const [w, c] of m) if (c < 0.6) m.delete(w);
    found.set(q, m);
  }
  return found.get(q);
};
// Each entry scores its best match for each word, by field, and more when the words make up most of its title. A rule
// page scores less than the page about its block. The entries that match the most words are kept, so one word nothing
// has doesn't empty the list.
const search = ({ all, postings, titles }, qs) => {
  const rows = new Map();
  qs.forEach((q, n) => {
    for (const [w, c] of matches(q, postings)) {
      const list = postings.get(w);
      for (let j = 0; j < list.length; j += 2) {
        if (!rows.has(list[j])) rows.set(list[j], qs.map(() => 0));
        const row = rows.get(list[j]), s = c * fields[list[j + 1]][1];
        if (s > row[n]) row[n] = s;
      }
    }
  });
  const ranked = [...rows].map(([i, row]) => {
    const title = titles[i], named = title.filter(w => qs.some(q => matches(q, postings).has(w))).length;
    const score = row.reduce((a, b) => a + b, 0) + (title.length ? 4 * named / title.length : 0) + (all[i].k === "page" ? 0.5 : 0);
    return { i, score: all[i].k === "rule" ? score * 0.6 : score, covered: row.filter(Boolean).length };
  });
  const most = Math.max(0, ...ranked.map(r => r.covered));
  return ranked.filter(r => r.covered === most).sort((a, b) => b.score - a.score || a.i - b.i).map(r => all[r.i]);
};
// A text as nodes, with the words that matched in <mark>.
const marked = (text, hit) => {
  const out = []; let at = 0;
  for (const m of text.matchAll(wordRe)) if (hit(m[0])) {
    out.push(text.slice(at, m.index), Object.assign(document.createElement("mark"), { textContent: m[0] }));
    at = m.index + m[0].length;
  }
  return [...out, text.slice(at)];
};
// The part of a text from just before its first match.
const excerpt = (text, hit) => {
  for (const m of text?.matchAll(wordRe) ?? []) if (hit(m[0])) {
    const start = m.index < 60 ? 0 : Math.min(m.index, text.indexOf(" ", m.index - 50) + 1);
    return (start ? "…" : "") + text.slice(start, start + 200);
  }
};
const parts = () => { const dialog = document.querySelector("dialog.search"); return { dialog, input: dialog.querySelector("input"), list: dialog.querySelector("[role=listbox]"), empty: dialog.querySelector(".search-empty") } };
const select = i => {
  const { input, list } = parts();
  active = i;
  for (const [j, a] of [...list.children].entries()) a.setAttribute("aria-selected", j === i);
  const a = list.children[i];
  if (a) { input.setAttribute("aria-activedescendant", a.id); a.scrollIntoView({ block: "nearest" }) } else input.removeAttribute("aria-activedescendant");
};
const update = async () => {
  const idx = await load(), { dialog, input, list, empty } = parts();
  const typed = input.value.toLowerCase().match(wordRe) ?? [], kept = typed.filter(w => !common.has(w));
  const qs = [...new Set((kept.length ? kept : typed).map(norm))];
  const hit = w => qs.some(q => matches(q, idx.postings).has(norm(w)));
  results = (qs.length ? search(idx, qs) : idx.all.filter(e => e.k === "page")).slice(0, 20);
  list.replaceChildren(...results.map((e, i) => {
    const a = Object.assign(document.createElement("a"), { id: "search-" + i, href: e.h, tabIndex: -1 }), title = document.createElement("span");
    a.setAttribute("role", "option");
    title.append(...marked(e.t, hit));
    a.append(Object.assign(document.createElement("small"), { textContent: e.p }), title);
    // When the title doesn't hold every word, the text that does says why it's here.
    const named = words(e.t);
    if (qs.some(q => !named.some(w => matches(q, idx.postings).has(w)))) {
      const said = excerpt(e.x, hit) ?? excerpt(e.d, hit) ?? e.d;
      if (said) { const p = document.createElement("p"); p.append(...marked(said, hit)); a.append(p) }
    }
    return a;
  }));
  empty.hidden = results.length > 0;
  input.setAttribute("aria-expanded", String(dialog.open));
  select(0);
};
const show = trigger => {
  restoreMenuFocus = trigger?.classList.contains("menu-search") ?? false;
  const menu = document.querySelector(".menu"), { dialog, input } = parts();
  if (menu) menu.open = false;
  dialog.showModal(); input.select(); update();
};
document.addEventListener("pointerover", e => { if (e.target.closest?.(".search-open")) load() });
document.addEventListener("click", e => {
  const open = e.target.closest(".search-open"), dialog = e.target.closest("dialog.search");
  if (open) show(open);
  else if (dialog && (e.target === dialog || e.target.closest(".search-close, [role=option]"))) dialog.close();
});
// close doesn't bubble, but it passes the document on its way down.
document.addEventListener("close", e => {
  if (!e.target.matches?.("dialog.search")) return;
  parts().input.setAttribute("aria-expanded", "false");
  if (restoreMenuFocus) { document.querySelector(".menu summary")?.focus(); restoreMenuFocus = false }
}, true);
document.addEventListener("input", e => { if (e.target.closest("dialog.search")) update() });
document.addEventListener("pointermove", e => { const a = e.target.closest?.("dialog.search [role=option]"); if (a) select([...a.parentElement.children].indexOf(a)) });
document.addEventListener("keydown", e => {
  const { dialog, list } = parts(), typing = e.target.closest("input, textarea, select, [contenteditable]");
  if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); if (dialog.open) dialog.close(); else show() }
  else if (!e.target.closest("dialog.search input")) return;
  else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && results.length) { e.preventDefault(); select((active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length) }
  // A click, so the docs app opens the page without a reload.
  else if (e.key === "Enter" && results[active]) { e.preventDefault(); list.children[active].click() }
});
}
`;
// What a page or a heading says, in one line, so search finds it by its words and not only its title. Code blocks
// are left out: an example's Markdown is made-up data, and the prose names what it shows.
const inlineTags = new Set([
  "a",
  "code",
  "del",
  "em",
  "ins",
  "kbd",
  "mark",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
]);
const prose = (nodes: Node[]): string =>
  nodes
    .map((node) => {
      if (typeof node === "string") return node;
      if (!isElement(node) || node[0] === "pre") return " ";
      const [tag, , ...children] = node;
      return inlineTags.has(tag) ? prose(children) : ` ${prose(children)} `;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
// A page's nodes cut at each h2 and h3: what comes before the first, then each heading with what follows it.
const sectionsOf = (nodes: Node[]) => {
  const parts: { heading?: ElementNode; nodes: Node[] }[] = [{ nodes: [] }];
  for (const node of nodes)
    if (isElement(node) && (node[0] === "h2" || node[0] === "h3"))
      parts.push({ heading: node, nodes: [] });
    else parts.at(-1)!.nodes.push(node);
  return parts;
};
// One entry per page and per heading: its title, where it sits, its link, and the words that find it. The rule pages
// go last, so a package's own pages come before the rules about its blocks.
const searchIndex = [
  ...[landing, ...parsed]
    .toSorted((a, b) => Number(Boolean(a.rule)) - Number(Boolean(b.rule)))
    .flatMap((page) => {
      const where = page.slug ? `${page.section.label} › ${page.label}` : page.section.label;
      const [intro, ...headed] = sectionsOf(page.document.nodes);
      return [
        {
          k: page.rule ? "rule" : "page",
          t: page.title,
          p: page.section.label,
          h: href(page.slug),
          d: page.description,
          w: page.keywords || undefined,
          x:
            `${page.tagline === page.description ? "" : page.tagline} ${prose(intro!.nodes)}`.trim() ||
            undefined,
        },
        ...headed.map(({ heading, nodes }) => ({
          k: "heading",
          t: textContent(heading!),
          p: where,
          h: `${href(page.slug)}#${str(heading![1].id)}`,
          x: prose(nodes) || undefined,
        })),
      ];
    }),
  {
    k: "page",
    t: "Playground",
    p: "Docs",
    h: "/play/",
    d: "Edit any example with every plugin and share a link to it.",
    w: "editor, sandbox, repl, try it, live preview",
  },
];

await rm(dist, { recursive: true, force: true });
await mkdir(new URL("fonts/", dist), { recursive: true });
await cp(new URL("public/", root), dist, { recursive: true });
for (const font of ["geist-sans/Geist-Variable.woff2", "geist-mono/GeistMono-Variable.woff2"])
  await cp(new URL(font, fonts), new URL(`fonts/${font.split("/")[1]}`, dist));
// comark-critic has no component to add its styles, so the site carries them.
const style = (await readFile(new URL("style.css", root), "utf8")) + criticCss;
await writeFile(new URL("search.json", dist), JSON.stringify(searchIndex));
// Pages inline the styles; the playground's preview loads them.
await writeFile(new URL("style.css", dist), style);
await build({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: fileURLToPath(new URL("play/", dist)),
    emptyOutDir: false,
    lib: { entry: fileURLToPath(new URL("play.ts", root)), formats: ["es"], fileName: "play" },
  },
});

// The page around the content: header, rail, the section's column, and a menu that holds both on narrow screens. The
// landing page has no sidebar, so its header links to the docs and the playground instead.
const searchDialog = `<dialog class="search" aria-label="Search the docs">
<div class="search-field">${siteIcon("search", 16)}<input type="text" enterkeyhint="search" role="combobox" aria-label="Search the docs" aria-controls="search-results" aria-expanded="false" aria-autocomplete="list" placeholder="Search the docs" autocomplete="off" spellcheck="false"><kbd>Esc</kbd><button type="button" class="search-close">Cancel</button></div>
<div id="search-results" class="search-results" role="listbox" aria-label="Results"></div>
<p class="search-empty" role="status" hidden>No page or heading matches.</p>
</dialog>`;
// Each page's title, description, and body, which the docs app (docs/app) serves, so its pages are this file's.
const fragments = new Map<string, { title: string; description: string; body: string }>();
function shell(options: {
  slug: string;
  section: Section;
  title: string;
  description: string;
  head?: string;
  body: string;
  // The package the npmx link opens; every package when it's none.
  npm?: string;
  landing?: boolean;
}) {
  const { slug, section } = options;
  const { npm } = options;
  const pageHead = options.head ?? "";
  const nav = rail(section) + column(section, slug);
  const header = `<div class="top-start"><a class="name" href="/">${logo}comark ui</a>${options.landing ? `<nav class="top-links" aria-label="Site"><a href="/guide/renderers/">Docs</a><a href="/play/">Playground</a><a href="https://drop.vitehub.dev">Drop</a></nav>` : ""}</div>
<button type="button" class="search-open" aria-haspopup="dialog">${siteIcon("search", 15)}<span class="search-label">Search docs</span><kbd><span class="kbd-mac">⌘K</span><span class="kbd-other">Ctrl K</span></kbd></button>
<div class="top-end">
<nav>${npmxLink(npm)}${githubLink}</nav>
<details class="menu"><summary aria-label="Menu" title="Menu">${menuIcon}</summary><div class="menu-panel"><button type="button" class="search-open menu-search" aria-haspopup="dialog">${siteIcon("search", 15)}<span>Search docs</span></button>${nav}</div></details>
</div>`;
  const body = `<header class="top">
${header}
</header>
${searchDialog}
${options.landing ? options.body : `<div class="layout">\n<aside class="sidebar">${nav}</aside>${revealCurrent}\n${options.body}\n</div>`}
<script>${searchScript.trim()}</script>`;
  if (section.slug !== "play")
    fragments.set(slug, { title: options.title, description: options.description, body });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(options.title)}</title>
<meta name="description" content="${escapeHtml(options.description)}">\n<link rel="canonical" href="${site}${href(slug)}">
<meta property="og:title" content="${escapeHtml(options.title)}">
<meta property="og:description" content="${escapeHtml(options.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${site}${href(slug)}">
<meta property="og:site_name" content="comark ui">
<meta property="og:image" content="${site}/og/home.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Review documents, written in Markdown: comark ui">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${site}/og/home.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/GeistMono-Variable.woff2" as="font" type="font/woff2" crossorigin>
<style>${style}${iconCss}</style>${pageHead}
</head>
<body>
${body}
</body>
</html>
`;
}

const footer = (credits?: string) =>
  `<footer><span>Built on <a href="https://comark.dev">Comark</a>.${credits ? ` ${credits}` : ""}</span><span>Made by <a href="https://onmax.me">Maxi García</a></span></footer>`;

// The landing page, as on vitehub.dev: the headline beside the install command, the packages, the example, and Drop.
await writeFile(
  new URL("index.html", dist),
  shell({
    slug: "",
    section: sections[0],
    landing: true,
    title: `${landing.title} · ${landing.description}`,
    description: landing.tagline,
    body: `<div class="landing">
<div class="landing-hero enter"><div><h1>${escapeHtml(landing.headline)}</h1><p>${escapeHtml(landing.tagline)}</p></div>
<div>${installerFor(landing.install)}<div class="actions"><a class="button primary" href="/play/">${siteIcon("flask-conical", 15)}Open the playground</a><a class="button" href="/guide/renderers/">Read the docs${siteIcon("arrow-right", 15)}</a></div></div></div>
<main class="enter" style="--i:1">${await renderHtmlFromDocument(landing.document, { components: { ...components, packages: packageGrid, drop, hero } })}</main>
${footer()}
</div>
<script>${script.trim()}</script>`,
  }),
);
console.log("docs/dist/index.html written");

for (const page of parsed) {
  const out = new URL(`${page.slug}/`, dist);
  // Getting started is comark-ui's page.
  const npm = page.pkg?.npm ?? (page.slug === "getting-started" ? "comark-ui" : undefined);
  // A block's name, and the package it comes in above it, unless the page is named for its package.
  const eyebrow = npm && npm !== page.title ? npm : "";
  await mkdir(out, { recursive: true });
  await writeFile(
    new URL("index.html", out),
    shell({
      slug: page.slug,
      section: page.section,
      npm,
      title: eyebrow ? `${page.title} · ${eyebrow}` : `${page.title} · ${page.description}`,
      description: page.tagline,
      body: `<div class="page">
<div class="content">
<div class="hero enter">${eyebrow ? `<p class="eyebrow mono">${eyebrow}</p>` : ""}${page.rule ? `<p class="eyebrow mono">${page.rule.code} · ${page.rule.severity ?? "warning"}</p>` : ""}<h1>${escapeHtml(page.title)}</h1><p>${page.rule ? inlineCode(page.rule.title) : escapeHtml(page.tagline)}</p>
${page.install ? installerFor(page.install) : ""}</div>
<main class="enter" style="--i:1">${(
        await renderHtmlFromDocument(page.document, {
          components: {
            ...components,
            // comark-chips would take the `@user` that comark-github's references draw, and the links comark-links
            // marks, so those pages show plain links.
            example: exampleWithout(
              ["github", "links"].includes(page.pkg?.slug ?? "") ? ["comark-chips"] : [],
            ),
            examples: exampleTabs,
            matrix,
            incorrect: ruleExample(page, "incorrect"),
            correct: ruleExample(page, "correct"),
            rules: ruleTable,
          },
        })
      ).replace(
        /<table>[\s\S]*?<\/table>/g,
        (table) => `<div class="table-scroll">${table}</div>`,
      )}</main>
${pager(page)}
${footer(page.pkg?.credits)}
</div>
${page.toc ? `<aside class="toc"><nav aria-label="On this page"><p class="nav-group">On this page</p>${page.toc}</nav></aside>` : ""}
</div>
<script>${script.trim()}</script>`,
    }),
  );
  console.log(`docs/dist/${page.slug}/index.html written`);
}

// The playground's Theme pane: the shared tokens, each a text field the swatch or slider fills, and free CSS for the
// rest. The script fills in each swatch and placeholder from the preview.
const tokenRow = (token: string, label: string, control: string) =>
  `<label for="play-token-${token}">${label}<code aria-hidden="true">--comark-${token}</code></label>${control}<input type="text" id="play-token-${token}" data-token="${token}" spellcheck="false" autocapitalize="off" autocomplete="off">`;
const capitalize = (word: string) => word[0]?.toUpperCase() + word.slice(1);
const themePane = `<div class="play-theme" data-pane="theme" hidden>
<div class="play-theme-bar"><div class="seg play-scheme" role="group" aria-label="Preview colors"><button type="button" data-scheme="light" aria-pressed="true">Light</button><button type="button" data-scheme="dark" aria-pressed="false">Dark</button></div><div class="play-theme-actions"><button type="button" class="play-theme-reset" hidden>Reset</button><button type="button" class="play-theme-copy">Copy CSS</button></div></div>
<div class="play-theme-field"><span id="play-theme-presets">Preset</span><div class="seg play-theme-presets" role="group" aria-labelledby="play-theme-presets">${themePresets.map((preset, index) => `<button type="button" data-theme="${preset.id}" aria-pressed="${index === 0}">${preset.label}</button>`).join("")}</div></div>
<div class="play-tokens">
${colorTokens.map((token) => tokenRow(token, capitalize(token), `<input type="color" data-swatch="${token}" aria-label="Pick the ${token} color">`)).join("\n")}
${tokenRow("radius", "Radius", `<input type="range" data-slider="radius" min="0" max="1.5" step="0.125" value="0.625" aria-label="Radius in rem">`)}
${tokenRow("font", "Font", "<span></span>")}
</div>
<details class="play-theme-field play-theme-extra"><summary>Extra CSS</summary><p>Each plugin's own variables, like <code>--cc-*</code> or <code>--ck-*</code>, or any rule, applied to the preview.</p><textarea id="play-theme-css" aria-label="Extra CSS" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder=":root { --cc-gap: 2rem; --ck-inset: 0.5rem }"></textarea></details>
</div>`;

// The playground opens on the first preset, rendered here so it shows before the script loads.
const playSection = sections.find((section) => section.slug === "play");
const first = presets[0];
if (playSection && first) {
  const document = await parseMarkdown(first.source, { plugins: sitePlugins() });
  await mkdir(new URL("play/", dist), { recursive: true });
  await writeFile(
    new URL("play/index.html", dist),
    shell({
      slug: "play",
      section: playSection,
      npm: first.npm,
      title: "Playground · Comark plugins",
      description:
        "Write Comark with every plugin and see it rendered as you type. Start from any example in the docs.",
      head: `\n<link rel="modulepreload" href="/play/play.js">\n${[...thumbnailStyles].join("")}`,
      body: `<div class="play">
<div class="play-editor">
<div class="play-bar"><div class="seg play-panes" role="group" aria-label="Editor"><button type="button" data-pane="markdown" aria-pressed="true">Markdown</button><button type="button" data-pane="config" aria-pressed="false">Config</button><button type="button" data-pane="theme" aria-pressed="false">Theme</button></div><button type="button" class="play-share">Copy link</button></div>
<div class="play-tools"><button type="button" class="play-reset" aria-label="Reset to the example" title="Reset to the example" hidden>${resetIcon}</button><button type="button" class="play-copy" aria-label="Copy the Markdown" title="Copy">${copyIcon}${checkIcon}</button></div>
<dialog class="play-confirm" aria-labelledby="play-confirm-title"><form method="dialog"><h2 id="play-confirm-title">Reset to the example?</h2><p>Your changes to the Markdown will be lost.</p><div><button value="cancel" autofocus>Cancel</button><button value="reset">Reset</button></div></form></dialog>
<div class="play-code" data-pane="markdown"><div class="play-paint" aria-hidden="true">${highlight(`${first.source}\n `)}</div><textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Markdown">${escapeHtml(first.source)}</textarea></div>
<div class="play-code" data-pane="config" hidden><div class="play-paint" aria-hidden="true">${highlight(`${defaultConfig}\n `, "json")}</div><textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Config">${escapeHtml(defaultConfig)}</textarea></div>
${themePane}
<ul class="play-issues" aria-label="Issues" aria-live="polite" hidden></ul>
</div>
<iframe class="play-preview" title="Preview" srcdoc="${escapeHtml(previewDocument(await renderHtmlFromDocument(document, { components })))}"></iframe>
</div>
<script type="application/json" id="presets">${JSON.stringify(presets.map(({ id, source, npm }) => ({ id, source, npm }))).replaceAll("<", "\\u003c")}</script>
<script type="module" src="/play/play.js"></script>`,
    }),
  );
  console.log("docs/dist/play/index.html written");
}

// Read by the docs app's server, which runs after this and replaces dist.
const generatedPages = new URL(".generated/pages/", root);
await rm(generatedPages, { recursive: true, force: true });
await mkdir(generatedPages, { recursive: true });
await writeFile(new URL("site.json", generatedPages), JSON.stringify({ css: iconCss + criticCss }));
for (const [slug, fragment] of fragments)
  await writeFile(
    new URL(`${slug.replaceAll("/", "~") || "index"}.json`, generatedPages),
    JSON.stringify(fragment),
  );
console.log(`docs/.generated/pages/ written (${fragments.size} pages)`);
