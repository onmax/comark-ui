import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { Nuxt } from "nuxt/schema";

// @vite-hub/docs points Tailwind at its dist/theme.js for the classes of its header and shell, but at the pinned build
// that file only re-exports a hashed chunk beside it, so Tailwind found none of them and the header lost its grid. Point
// Tailwind at every chunk. Remove this module once @vite-hub/docs adds the chunk itself.
export default function docsThemeSource(_: unknown, nuxt: Nuxt) {
  const dist = dirname(createRequire(import.meta.url).resolve("@vite-hub/docs"));
  nuxt.hook("app:templates", (app) => {
    const ui = app.templates.find((template) => template.filename === "ui.css");
    const getContents = ui?.getContents;
    if (ui && getContents)
      ui.getContents = async (data) =>
        `${await getContents(data)}\n@source "${dist}/theme-*.js";\n`;
  });
}
