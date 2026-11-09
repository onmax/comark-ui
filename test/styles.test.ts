// Apps run these styles through their own CSS pipeline. Nuxt minifies with cssnano 8, whose postcss-calc 10 can't
// parse a `calc()` in a `var()` fallback inside another `calc()`, or channel keywords in a relative color's `calc()`.
// It warns and leaves the rule, so vitehub.dev turned the calc pass off rather than ship warnings.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import calc from "postcss-calc";
import { expect, it } from "vite-plus/test";

const packages = new URL("../packages/", import.meta.url);
const sheets = readdirSync(packages).flatMap((folder) => {
  const dist = new URL(`${folder}/dist/`, packages);
  return existsSync(dist)
    ? readdirSync(dist)
        .filter((file) => file.endsWith(".css"))
        .map((file) => `${folder}/dist/${file}`)
    : [];
});

it("finds the built sheets", () => {
  expect(sheets).toEqual(expect.arrayContaining(["zoom/dist/style.css", "ui/dist/typeset.css"]));
});

it.each(sheets)("%s goes through postcss-calc without a warning", async (sheet) => {
  const css = readFileSync(new URL(sheet, packages), "utf8");
  const result = await postcss([calc({})]).process(css, { from: sheet });
  expect(result.warnings().map(({ text }) => text)).toEqual([]);
});

// Nuxt runs autoprefixer too, which throws on an `@supports` whose `selector(::…)` follows another condition.
it.each(sheets)("%s goes through autoprefixer", async (sheet) => {
  const css = readFileSync(new URL(sheet, packages), "utf8");
  const result = await postcss([autoprefixer()]).process(css, { from: sheet });
  expect(result.warnings().map(({ text }) => text)).toEqual([]);
});
