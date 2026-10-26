import { defineContent, documents } from "vite-hub/content";
import cms from "vite-hub/content/presets/cms";
import * as v from "valibot";
import { inTeam } from "./utils/team.ts";

// The Markdown the site renders. A save commits to the draft branch, and publishing opens a pull request into main, so
// the published pages still come from the files in the repository when the site is built. Pages the build writes
// itself (the landing page's examples, the playground) are not here.
const fields = { title: v.optional(v.string()), description: v.optional(v.string()) };

export const content = defineContent({
  extends: [
    cms,
    { store: "github", repo: "onmax/comark-plugins", publish: "pr", draftBranch: "vitehub/content", root: "" },
  ],
  collections: {
    // docs/pages/guide/theming.md is /guide/theming/.
    pages: documents({ path: "docs/pages/**/*.md", fields, label: "Pages" }),
    // packages/zoom/docs/theming.md is /zoom/theming/, and packages/zoom/docs/index.md is /zoom/.
    packages: documents({
      path: "packages/*/docs/**/*.md",
      fields,
      label: "Package pages",
      route: (id) => `/${id.replace("/docs", "").replace(/\/index$/, "")}`,
    }),
  },
  authorize: ({ user }) => inTeam(user),
});
