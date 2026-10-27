// `comark-ui/skills` is what a host such as Drop serves to its agents, and `comark-ui/skills/<name>/` is what an app
// copies whole. Both come from the build, so this reads them as a consumer would, through the package's exports.
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, posix } from "node:path";
import { parseMarkdown } from "comark";
import { skills, version } from "comark-ui/skills";
import { describe, expect, it } from "vite-plus/test";
import preset, { type PresetOptions } from "../src/html.ts";

const require = createRequire(import.meta.url);
const repo = new URL("../../../", import.meta.url);
const offline: PresetOptions = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
};

it("ships every skill in the repository, at this version", () => {
  const folders = readdirSync(new URL("skills/", repo)).toSorted();
  expect(skills.map((skill) => skill.name)).toEqual(folders);
  expect(version).toBe((require("comark-ui/package.json") as { version: string }).version);
});

describe.each(skills.map((skill) => [skill.name, skill] as const))("%s", (name, skill) => {
  const folder = dirname(require.resolve(`comark-ui/skills/${name}/SKILL.md`));

  it("is a valid Agent Skill", () => {
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(skill.description.length).toBeGreaterThan(0);
    expect(skill.description.length).toBeLessThanOrEqual(1024);
    expect(skill.files[0]?.path).toBe("SKILL.md");
  });

  it("holds the same files as its installable folder", () => {
    const installed = readdirSync(folder, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => posix.relative(folder, `${entry.parentPath}/${entry.name}`));
    expect(skill.files.map((file) => file.path).toSorted()).toEqual(installed.toSorted());
    for (const file of skill.files)
      expect(file.text, file.path).toBe(readFileSync(`${folder}/${file.path}`, "utf8"));
  });

  // A skill installs on its own, so a relative link that leaves its folder breaks.
  it("links only to its own files", () => {
    const paths = new Set(skill.files.map((file) => file.path));
    for (const file of skill.files.filter((file) => file.path.endsWith(".md"))) {
      const prose = file.text.replace(/^(`{3,})[\s\S]*?^\1/gm, "").replace(/(`+)[^`]*?\1/g, "");
      for (const [, target = ""] of prose.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
        if (/^[a-z]+:/.test(target)) continue;
        const resolved = posix.normalize(posix.join(posix.dirname(file.path), target));
        expect(paths.has(resolved), `${name}/${file.path} links to ${target}`).toBe(true);
      }
    }
  });

  const example = skill.files.find((file) => file.path === "references/example.md");
  it.runIf(example)("has an example that renders without issues", async () => {
    const { meta } = await parseMarkdown(example!.text, { plugins: preset(offline).plugins });
    expect(meta.issues).toEqual([]);
  });
});
