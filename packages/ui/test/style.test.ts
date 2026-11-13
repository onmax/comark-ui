// `comark-ui/style.css` is what a page links so server-rendered blocks are styled before the components mount. It comes
// from the build, so this reads it as a consumer would, through the package's exports.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import autoprefixer from "autoprefixer";
import { mermaidCss } from "comark-ui/client";
import { issuesCss } from "comark-ui/html";
import { transform } from "lightningcss";
import postcss from "postcss";
import { expect, it } from "vite-plus/test";

const require = createRequire(import.meta.url);
const read = (path: string) => readFileSync(require.resolve(path), "utf8");
const css = read("comark-ui/style.css");
const { dependencies } = require("comark-ui/package.json") as {
  dependencies: Record<string, string>;
};
const styled = Object.keys(dependencies).filter(
  (name) =>
    "./style.css" in
    (require(`${name}/package.json`) as { exports: Record<string, unknown> }).exports,
);

it("holds every package's styles, the Mermaid wrapper's, and the issues box's", () => {
  expect(styled).toEqual(expect.arrayContaining(["comark-code", "comark-tabs", "comark-zoom"]));
  for (const name of styled) expect(css, name).toContain(read(`${name}/style.css`));
  expect(css).toContain(mermaidCss);
  expect(css).toContain(issuesCss);
});

it("keeps every rule in the comark layer", () => {
  for (const sheet of css.split("\n")) expect(sheet).toMatch(/^(@import [^;]+;)*@layer comark\{/);
});

// Vite minifies CSS with lightningcss, and Nuxt runs autoprefixer, so an app that imports the file builds only if both
// read all of it.
it("goes through lightningcss and autoprefixer", async () => {
  const minified = transform({ filename: "style.css", code: Buffer.from(css), minify: true });
  expect(minified.warnings).toEqual([]);
  const prefixed = await postcss([autoprefixer({ overrideBrowserslist: ["defaults"] })]).process(
    css,
    {
      from: undefined,
    },
  );
  expect(prefixed.warnings()).toEqual([]);
});
