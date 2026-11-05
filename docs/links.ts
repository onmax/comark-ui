// Checks every internal link in the built docs the way the deployed site answers it: the Worker's redirects first, then
// the dynamic badge endpoint or prerendered files. A link that redirects, has no target, or names a heading that
// isn't there fails the build.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { excludedLinks } from "./link-excludes.ts";
import { redirectTarget, SITE } from "./server/utils/site.ts";

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

const decode = (text: string) =>
  text.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
const attributes = (html: string, names: string) =>
  [...html.matchAll(new RegExp(`\\s(?:${names})=(?:"([^"]*)"|'([^']*)')`, "g"))].map(([, a, b]) =>
    decode(a ?? b ?? ""),
  );
// An unhandled Comark component such as <include src="tour.md"> doesn't load its src in the browser.
// Read attributes from elements, and only treat src as a URL on HTML elements that load it.
const linksOf = (html: string) =>
  [...html.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)].flatMap(([element, tag]) =>
    attributes(
      element,
      /^(audio|embed|iframe|img|input|script|source|track|video)$/i.test(tag!)
        ? "href|src"
        : "href",
    ),
  );

const urlOf = (file: string) => {
  const path = `/${relative(root, file)}`;
  return path.endsWith("/index.html")
    ? path.slice(0, -"index.html".length)
    : path.replace(/\.html$/, "");
};
const fileOf = (path: string) => {
  const page = path.replace(/\/$/, "");
  return [path, `${page}.html`, `${page}/index.html`]
    .map((candidate) => join(root, candidate))
    .find((file) => existsSync(file) && statSync(file).isFile());
};

// The playground's preset column and the gallery's cells are pieces that the tool pages load, not pages.
const files = pages(root).filter(
  (file) => !/^play\/(presets\.html$|gallery\/)/.test(relative(root, file)),
);
const idCache = new Map<string, Set<string>>();
const idsOf = (file: string) => {
  const cached = idCache.get(file);
  if (cached) return cached;
  const ids = new Set(attributes(readFileSync(file, "utf8"), "id|name"));
  idCache.set(file, ids);
  return ids;
};

const problems = new Set<string>();
for (const file of files) {
  const page = urlOf(file);
  const html = readFileSync(file, "utf8");
  for (const link of linksOf(html)) {
    const url = new URL(link, `${SITE}${page}`);
    if (url.origin !== SITE) continue;
    if (
      excludedLinks.some(
        (pattern) =>
          pattern.test(link) || pattern.test(url.pathname) || pattern.test(url.pathname + url.hash),
      )
    )
      continue;
    const moved = redirectTarget(url);
    if (moved) {
      problems.add(
        `${page} links to ${url.pathname}, which the Worker redirects to ${moved}. Link there, or exempt the page in docs/server/utils/site.ts.`,
      );
      continue;
    }
    // Nitro serves this endpoint even when no badge image was downloaded at build time.
    if (url.pathname === "/badge.svg") continue;
    const target = fileOf(url.pathname);
    if (!target) {
      problems.add(
        `${page} links to ${url.pathname}, which has no page or file. Fix the link or add the page.`,
      );
      continue;
    }
    // The playground reads its fragment as state, not as a heading.
    if (url.hash.length > 1 && target.endsWith(".html") && !/^\/play\/?$/.test(url.pathname)) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!idsOf(target).has(id))
        problems.add(
          `${page} links to ${url.pathname}${url.hash}, but that page has no heading or element with the id "${id}". Fix the fragment.`,
        );
    }
  }
}

if (problems.size) {
  console.error(`${problems.size} broken link${problems.size === 1 ? "" : "s"} in the docs:`);
  for (const problem of [...problems].toSorted()) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`Checked the links of ${files.length} pages.`);
