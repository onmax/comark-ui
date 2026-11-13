// The bundle examples measure two made-up builds, comark-bundle's test fixtures, wherever the site renders them at build
// time: the landing's cards and the gallery. Node only, since it reads the disk; docs/markdown.ts finds them its own way,
// because Nitro bundles it.
import bundle from "../packages/bundle/src/index.ts";

const root = new URL("../packages/bundle/test/fixtures/vite/", import.meta.url).pathname;

export const withBuilds = <Plugin extends { name?: string }>(plugins: Plugin[]) =>
  plugins.map((plugin) =>
    plugin.name === "comark-bundle" ? (bundle({ root }) as Plugin) : plugin,
  );
