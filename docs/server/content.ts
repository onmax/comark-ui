import { defineContent, documents } from "vite-hub/content";
import cms from "vite-hub/cms";
import * as v from "valibot";
import { inTeam } from "./utils/team.ts";

// The Markdown the site renders. A save commits to the draft branch, and publishing opens a pull request into main, so
// the published pages still come from the files in the repository when the site is built. Pages the build writes
// itself (the landing page's examples, the playground) are not here.
// The page the site serves for a file. content.resolve() finds a page's document by its url, which is how a comment on
// a page belongs to the Markdown behind it.
const page = (path: string) => `/${path.replace(/(^|\/)index$/, "")}`;
const packagePage = (id: string) => page(id.replace("/docs", ""));
// The sitemap lists every page; a partial is included into other pages and has none of its own.
const url =
  (route: (id: string) => string) =>
  ({ id }: { id: string }) =>
    /(^|\/)partials\//.test(id) ? null : route(id);
const fields = { title: v.optional(v.string()), description: v.optional(v.string()) };

export const content = defineContent({
  route: false,
  extends: [
    cms,
    {
      store: "github",
      repo: "onmax/comark-ui",
      publish: "pr",
      draftBranch: "vitehub/content",
      root: "",
    },
  ],
  collections: {
    // docs/pages/guide/theming.md is /guide/theming.
    pages: documents({
      path: "docs/pages/**/*.md",
      fields,
      label: "Pages",
      url: url(page),
    }),
    // packages/zoom/docs/theming.md is /zoom/theming, and packages/zoom/docs/index.md is /zoom.
    packages: documents({
      path: "packages/*/docs/**/*.md",
      fields,
      label: "Package pages",
      url: url(packagePage),
    }),
  },
  authorize: ({ user }) => inTeam(user),
  // @vite-hub/docs serves the sitemap and robots.txt (nuxt.config.ts).
  seo: { site: "https://comark-ui.onmax.me", sitemap: false },
});
