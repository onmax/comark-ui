import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { Nuxt } from "nuxt/schema";

const dir = fileURLToPath(new URL("../.generated/comark-styles/", import.meta.url));

// comark-ui's components add their styles when they mount, so the server's HTML painted every block unstyled until the
// app hydrated, and the page jumped. The head links comark-ui/style.css instead, as a static file that Vite's CSS
// pipeline never parses. It goes after the app's CSS, where the components used to add their styles, since the docs'
// own rules for code blocks tie with some unlayered rules of theirs, which must still win. The file names the layer
// order too, in case it loads first. The link carries each package's `data-comark-<name>`, so no component adds its
// styles again, except comark-time's: the file leaves out its anchored query, which only its component adds.
// @vite-hub/docs links the same styles since vite-hub/vitehub#3572; drop this module once the site builds on a version
// with it.
export default function comarkStyles(_: unknown, nuxt: Nuxt) {
  // `pnpm install` prepares the docs before the packages are built.
  if (nuxt.options._prepare) return;
  const require = createRequire(import.meta.url);
  const { dependencies = {} } = require("comark-ui/package.json") as {
    dependencies?: Record<string, string>;
  };
  const names = [
    ...Object.keys(dependencies)
      .filter((name) => name.startsWith("comark-") && name !== "comark-time")
      .map((name) => name.slice("comark-".length)),
    "mermaid",
  ];
  const css = `@layer theme, base, comark, components, utilities;\n${readFileSync(require.resolve("comark-ui/style.css"), "utf8")}`;
  const file = `comark-${createHash("sha256").update(css).digest("hex").slice(0, 10)}.css`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}${file}`, css);

  nuxt.hook("nitro:init", (nitro) => {
    nitro.options.publicAssets.push({ dir, baseURL: "/_comark/", maxAge: 31536000 });
  });
  nuxt.options.app.head.link ??= [];
  nuxt.options.app.head.link.push({
    rel: "stylesheet",
    href: `/_comark/${file}`,
    tagPriority: "low",
    ...Object.fromEntries(names.map((name) => [`data-comark-${name}`, ""])),
  });
}
