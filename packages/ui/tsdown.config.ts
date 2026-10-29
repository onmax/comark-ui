import { readdirSync, readFileSync, statSync } from "node:fs";
import { parseMarkdown } from "comark";
import { definePackage } from "../../tsdown.shared.ts";
import type { Skill } from "./src/skills.ts";

const root = new URL("../../skills/", import.meta.url);
const decoder = new TextDecoder("utf-8", { fatal: true });
// Every skill as text for `comark-ui/skills`. A binary file would need bytes in the registry, so it fails the build
// until one is worth that.
const skills: Skill[] = await Promise.all(
  readdirSync(root)
    .filter((name) => statSync(new URL(name, root)).isDirectory())
    .toSorted()
    .map(async (name) => {
      const folder = new URL(`${name}/`, root);
      const files = readdirSync(folder, { recursive: true, encoding: "utf8" })
        .filter((path) => statSync(new URL(path, folder)).isFile())
        .map((path) => {
          try {
            return { path, text: decoder.decode(readFileSync(new URL(path, folder))) };
          } catch {
            throw new Error(
              `skills/${name}/${path} isn't UTF-8 text; comark-ui/skills ships text only.`,
            );
          }
        })
        .toSorted(
          (a, b) =>
            Number(b.path === "SKILL.md") - Number(a.path === "SKILL.md") ||
            a.path.localeCompare(b.path),
        );
      const skill = files.find((file) => file.path === "SKILL.md");
      if (!skill) throw new Error(`skills/${name} has no SKILL.md.`);
      const { frontmatter } = await parseMarkdown(skill.text);
      const { description } = frontmatter;
      if (frontmatter.name !== name || !description)
        throw new Error(`skills/${name}/SKILL.md needs name: ${name} and a description.`);
      // SAFETY: a description is one line of text, which YAML reads as a string.
      return { name, description: description as string, frontmatter, files };
    }),
);
const manifest: unknown = JSON.parse(
  readFileSync(new URL("package.json", import.meta.url), "utf8"),
);
if (!(manifest instanceof Object && "version" in manifest))
  throw new Error("packages/ui/package.json has no version.");
// SAFETY: the workspace test checks that every manifest's version is the shared version string.
const { version } = manifest as { version: string };

export default definePackage({
  entry: [
    "src/index.ts",
    "src/client.ts",
    "src/editor.ts",
    "src/editor-vue.ts",
    "src/html.ts",
    "src/nuxt-ui.ts",
    "src/skills.ts",
    "src/vue.ts",
    "src/react.ts",
  ],
  define: {
    __COMARK_SKILLS__: JSON.stringify(skills),
    __COMARK_UI_VERSION__: JSON.stringify(version),
  },
  // Svelte entries ship as source, like every package's. The skills ship as folders too, for an app that copies one
  // whole into its own skills, as `vp dlx skills add` would install it.
  copy: [
    { from: "src/svelte", to: "dist" },
    { from: "../../skills", to: "dist" },
  ],
});
