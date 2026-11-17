// The HTML renderers inline a function's source with `toString()`, so nothing it imports reaches the page. A polyfill
// imported next to an inlined function would run in the bundled `start()` and be missing from the inline script, and
// AGENTS.md rules out polyfills there anyway. This fails when a module whose function is inlined imports one.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vite-plus/test";

const packages = new URL("../packages/", import.meta.url);
const polyfill = /polyfill|^core-js(\/|$)|^@ungap\//;

// A sibling package by name, such as `comark-time/client`, resolves to the source its export is built from.
const folderOf = new Map(
  readdirSync(packages)
    .filter((folder) => existsSync(new URL(`${folder}/package.json`, packages)))
    .map((folder) => [
      JSON.parse(readFileSync(new URL(`${folder}/package.json`, packages), "utf8")).name as string,
      folder,
    ]),
);
const resolve = (specifier: string, from: URL): URL => {
  if (specifier.startsWith(".")) return new URL(specifier, from);
  const [scope = "", rest = ""] = specifier.split(/\/(.*)/);
  const folder = folderOf.get(scope);
  if (!folder)
    throw new Error(`${from.pathname} inlines a function from ${specifier}, outside the workspace`);
  return new URL(`${folder}/src/${rest || "index"}.ts`, packages);
};

const inlined = readdirSync(packages).flatMap((folder) => {
  const html = new URL(`${folder}/src/html.ts`, packages);
  if (!existsSync(html)) return [];
  const source = readFileSync(html, "utf8");
  const from = new Map<string, string>();
  for (const [, names = "", path = ""] of source.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g,
  ))
    for (const name of names.split(","))
      from.set(
        name
          .trim()
          .split(/\s+as\s+/)
          .at(-1) ?? "",
        path,
      );
  return [...source.matchAll(/\$\{(\w+)\.toString\(\)\}/g)].map(([, name = ""]) => {
    const path = from.get(name);
    if (!path)
      throw new Error(
        `packages/${folder}/src/html.ts inlines ${name}, but doesn't import it by name`,
      );
    const module = resolve(path, html);
    return { name, module, file: module.pathname.slice(packages.pathname.length) };
  });
});

it("finds the inlined functions", () => {
  expect(inlined.map(({ module }) => module.pathname)).toEqual(
    expect.arrayContaining([new URL("zoom/src/script.ts", packages).pathname]),
  );
});

it.each(inlined)("$file, inlined as $name, imports no polyfill", ({ module }) => {
  const source = readFileSync(module, "utf8");
  const imports = [
    ...source.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\bfrom\s*)?"([^"]+)"/gm),
    ...source.matchAll(/\bimport\(\s*["'`]([^"'`]+)["'`]/g),
  ].map(([, specifier]) => specifier);
  expect(imports.filter((specifier) => polyfill.test(specifier ?? ""))).toEqual([]);
});
