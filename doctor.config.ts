import { existsSync } from "node:fs";
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";
import parts from "./doctor/parts.ts";

const repo = new URL("./", import.meta.url);

// The packages run their own Doctor configs; this one lints the docs pages and the agent skill with comark-linter, and
// checks across packages with the repository's own Rules.
export default defineDoctorConfig({
  extends: ["comark/recommended", "comark-plugins/recommended"],
  extensions: [
    parts,
    comark({
      include: "{docs/pages,packages/*/docs}/**/*.md",
      // The docs app's own blocks, in docs/app/components/content, and the old site's that it doesn't draw yet.
      components: [
        "correct",
        "demo",
        "drop",
        "example",
        "examples",
        "hero",
        "incorrect",
        "landing-hero",
        "matrix",
        "packages",
        "rules",
        "skill",
        "skills",
        "usage",
      ],
      links: {
        // As docs/content.ts copies them: a package's pages come from its docs/, the rest from docs/pages, and files
        // from docs/public.
        routes(path) {
          // @vite-hub/docs also serves llms.txt and each page's Markdown copy.
          if (path === "/llms.txt" || path === "/index.md") return true;
          const markdown = /^(?:\/raw)?(\/.+)\.md$/.exec(path)?.[1];
          if (markdown) path = `${markdown}/`;
          const [first = "", ...rest] = path.split("/").filter(Boolean);
          if (first === "play" || path === "/badge.svg") return true;
          if (existsSync(new URL(`packages/${first}/docs/index.md`, repo)))
            return `packages/${first}/docs/${rest.join("/")}`;
          return /\.\w+$/.test(path) ? `docs/public${path}` : `docs/pages${path}`;
        },
      },
    }),
  ],
});
