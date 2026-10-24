// A new package has to be registered in several places that nothing else checks: its manifest's shared fields, the
// linter that loads it, the docs that render it, the README that lists it, and the agent skill that teaches it. This
// fails on the first one missed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const repo = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, repo), "utf8");
const folders = readdirSync(new URL("packages/", repo)).filter((folder) =>
  existsSync(new URL(`packages/${folder}/package.json`, repo)),
);
type Manifest = {
  name: string;
  version: string;
  license: string;
  author: string;
  type: string;
  homepage: string;
  bugs: string;
  repository: { directory: string };
  files: string[];
  engines?: { node: string };
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};
// SAFETY: every package.json in packages/ is a published manifest with these fields; the tests below check them.
const manifest = (folder: string) =>
  JSON.parse(read(`packages/${folder}/package.json`)) as Manifest;
const withRenderer = folders.filter((folder) =>
  existsSync(new URL(`packages/${folder}/src/html.ts`, repo)),
);

describe.each(folders)("packages/%s", (folder) => {
  const pkg = manifest(folder);

  it("shares the workspace's version, license, and links", () => {
    expect(pkg).toMatchObject({
      version: manifest("zoom").version,
      license: "MIT",
      author: "onmax",
      type: "module",
      // comark-ui is what the whole site documents, so its home is the site.
      homepage:
        folder === "ui" ? "https://comark-ui.onmax.me" : `https://comark-ui.onmax.me/${folder}`,
      bugs: "https://github.com/onmax/comark-ui/issues",
      repository: { directory: `packages/${folder}` },
      engines: { node: ">=22.12.0" },
    });
    expect(pkg.files).toContain("dist");
    expect(pkg.files).not.toContain("docs");
  });

  it("builds with the shared preset, and before it packs", () => {
    expect(pkg.scripts.build).toBe("tsdown");
    expect(pkg.scripts.prepack).toMatch(new RegExp(`pnpm --filter ${pkg.name}(\\.\\.\\.)? build$`));
    expect(read(`packages/${folder}/tsdown.config.ts`)).toContain('from "../../tsdown.shared.ts"');
  });

  it("starts its LICENSE with the repository's", () => {
    expect(read(`packages/${folder}/LICENSE`).startsWith(read("LICENSE").trimEnd())).toBe(true);
  });

  // A package with no renderer runs from the preset's core, so it works in every renderer.
  it("comes with the preset", () => {
    if (folder === "ui" || folder === "lint") return;
    expect(manifest("ui").dependencies?.[pkg.name]).toBe("workspace:^");
    if (!withRenderer.includes(folder))
      expect(read("packages/ui/src/index.ts")).toContain(`from "${pkg.name}"`);
  });

  it("has docs with a place in the site, and a row in the README", () => {
    expect(read("README.md")).toContain(`[\`${pkg.name}\`](./packages/${folder})`);
    if (folder === "ui") return;
    expect(existsSync(new URL(`packages/${folder}/docs/index.md`, repo))).toBe(true);
    expect(read("docs/build.ts")).toContain(`"${folder}",`);
  });

  // Agents write most documents, and they learn a package from the skill rather than the site. Hosts whose agents only
  // write Markdown, such as Drop, cut each reference at its Register section, so it comes last.
  it("has a reference in the agent skill, linked from SKILL.md, that ends with Register", () => {
    const skill = "skills/comark-ui/";
    expect(existsSync(new URL(`${skill}references/${folder}.md`, repo))).toBe(true);
    expect(read(`${skill}SKILL.md`)).toContain(`](references/${folder}.md)`);
    const reference = read(`${skill}references/${folder}.md`);
    expect(reference.match(/^## .*/gm)?.at(-1)).toBe("## Register");
  });
});

describe.each(withRenderer)("the renderer of packages/%s", (folder) => {
  const { name } = manifest(folder);

  it("is an optional peer the linter loads", () => {
    const lint = manifest("lint");
    expect(lint.peerDependencies?.[name]).toBe("workspace:^");
    expect(lint.peerDependenciesMeta?.[name]).toEqual({ optional: true });
    expect(read("packages/lint/src/config.ts")).toContain(`import("${name}/html")`);
  });

  // The site renders through the preset, so a package in it is on the site and in the playground.
  it("is in the preset, which renders the docs and the playground", () => {
    expect(read("docs/plugins.ts")).toContain('from "../packages/ui/src/html.ts"');
    if (folder === "ui") return;
    const preset = read("packages/ui/src/html.ts");
    const local = folder.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    expect(preset).toContain(`import * as ${local} from "${name}/html"`);
    expect(preset.slice(preset.indexOf("preset<"))).toMatch(new RegExp(`\\b${local}\\b`));
  });
});
