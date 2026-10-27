import { existsSync } from "node:fs";
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";

const repo = new URL("./", import.meta.url);

// The packages run their own Doctor configs; this one only lints the docs pages and the agent skill with comark-linter.
export default defineDoctorConfig({
  extends: ["comark/recommended"],
  extensions: [
    comark({
      include: "{docs/pages,packages/*/docs}/**/*.md",
      // docs/build.ts renders these itself.
      components: [
        "badge-builder",
        "correct",
        "demo",
        "drop",
        "example",
        "examples",
        "hero",
        "incorrect",
        "matrix",
        "packages",
        "rules",
        "skill",
        "skills",
        "usage",
      ],
      links: {
        // fileOf in docs/build.ts: a package's pages come from its docs/, the rest from docs/pages, and files from
        // docs/public. The playground is built by docs/play.ts and has no page.
        routes(path) {
          // docs/build.ts also writes llms.txt and each page's Markdown copy, at its path plus `.md`.
          if (path === "/llms.txt" || path === "/index.md") return true;
          const markdown = /^(\/.+)\.md$/.exec(path)?.[1];
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
