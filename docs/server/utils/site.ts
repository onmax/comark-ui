// The docs moved from comark-annotate.onmax.me to comark.onmax.me/annotate, then to comark-ui.onmax.me. Old links
// redirect; the skill, images, and fonts keep their paths, so agents that installed the skill from an old address still
// find it.
export const SITE = "https://comark-ui.onmax.me";
const MOVED: Record<string, string | undefined> = {
  "comark.onmax.me": "",
  "comark-annotate.onmax.me": "/annotate",
};
const KEEP = /^\/(\.well-known\/|fonts\/)|\.(png|svg|woff2)$/;
// Each package had a page per topic until its pages merged into one; the linter keeps its own, and the guides are
// their own section with a Theming page. The preset's page is Getting started now that it's comark-ui, and the
// charts' sub-pages left components/, where the annotation page became Notes.
const MERGED =
  /^\/(?!lint\/|guide\/)([\w-]+)\/(?:getting-started|syntax|components|guides|theming)\/?$/;
const RENAMED: Record<string, string | undefined> = {
  "/preset/": "/getting-started/",
  "/charts/components/annotation/": "/charts/notes/",
  "/charts/components/gantt/": "/charts/gantt/",
  "/charts/components/vega-lite/": "/charts/vega-lite/",
};

/** Where an old host or an old path now lives, or nothing when the request is current. */
export function redirectTarget(url: URL): string | undefined {
  const prefix = MOVED[url.hostname];
  if (prefix !== undefined) {
    const path = KEEP.test(url.pathname) ? url.pathname : `${prefix}${url.pathname}`;
    return `${SITE}${path}${url.search}${url.hash}`;
  }
  if (url.pathname === "/badge.svg") return;
  const merged = MERGED.exec(url.pathname);
  const moved = merged ? `/${merged[1]}/` : RENAMED[url.pathname.replace(/\/?$/, "/")];
  if (moved) return `${SITE}${moved}${url.search}${url.hash}`;
}

type Assets = { fetch: (request: Request) => Promise<Response> };

/**
 * The prerendered file for a request, from the assets binding. The Worker runs before the assets so the redirects
 * above come first, so this answers what the assets would have: a page, a file, or the page's Markdown copy for an
 * agent that asks for Markdown. A path with no file returns nothing, and Nitro goes on to its own routes.
 */
export async function fromAssets(request: Request, assets: Assets): Promise<Response | undefined> {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  if (url.pathname.endsWith("/") && request.headers.get("accept")?.includes("text/markdown")) {
    url.pathname = url.pathname === "/" ? "/index.md" : `${url.pathname.slice(0, -1)}.md`;
    const markdown = await assets.fetch(new Request(url, request));
    if (markdown.ok) return markdown;
  }
  const asset = await assets.fetch(request);
  if (asset.status !== 404) return asset;
}
