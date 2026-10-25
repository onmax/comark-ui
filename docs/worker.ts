import { createBadgeHandler } from "../packages/badge/src/server.ts";

const badge = createBadgeHandler();
// The docs moved from comark-annotate.onmax.me to comark.onmax.me/annotate, then to comark-ui.onmax.me. Old links
// redirect; the skill, images, and fonts keep their paths, so agents that installed the skill from an old address still
// find it.
const SITE = "https://comark-ui.onmax.me";
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

export default {
  async fetch(
    request: Request,
    env: { ASSETS: { fetch: (request: Request) => Promise<Response> } },
  ) {
    const url = new URL(request.url);
    const prefix = MOVED[url.hostname];
    if (prefix === undefined) {
      if (url.pathname === "/badge.svg") return badge(request);
      const merged = MERGED.exec(url.pathname);
      const moved = merged ? `/${merged[1]}/` : RENAMED[url.pathname.replace(/\/?$/, "/")];
      if (moved) return Response.redirect(`${SITE}${moved}${url.search}${url.hash}`, 301);
      // An agent that asks for Markdown gets the page's Markdown copy.
      if (url.pathname.endsWith("/") && request.headers.get("accept")?.includes("text/markdown")) {
        url.pathname = url.pathname === "/" ? "/index.md" : `${url.pathname.slice(0, -1)}.md`;
        const markdown = await env.ASSETS.fetch(new Request(url, request));
        if (markdown.ok) return markdown;
      }
      return env.ASSETS.fetch(request);
    }
    const path = KEEP.test(url.pathname) ? url.pathname : `${prefix}${url.pathname}`;
    return Response.redirect(`${SITE}${path}${url.search}${url.hash}`, 301);
  },
};
