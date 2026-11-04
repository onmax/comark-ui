// Copies the chosen packages' docs into content/ in the shape @vite-hub/docs reads: one section folder per package,
// with a .navigation.yml, and frontmatter cut down to the fields its strict schema accepts.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const repo = join(root, "..");
const content = join(root, "content");

export const sections = ["zoom", "tabs", "carousel", "charts", "github"];

// @vite-hub/docs rejects any other frontmatter field with DocsContentError.
const kept = new Set([
  "title",
  "description",
  "icon",
  "layout",
  "navigation",
  "seo",
  "toc",
  "sidebar",
]);

const icon = (name) => (name.includes(":") || name.startsWith("i-") ? name : `i-lucide-${name}`);

function page(source) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!match) return { frontmatter: {}, body: source };
  return { frontmatter: parse(match[1]) ?? {}, body: source.slice(match[0].length) };
}

// Site links are `/zoom/#theme`; pages outside the copied sections stay on the live site.
function links(body) {
  return body.replace(/\]\(\/([a-z-]+)(\/[^)\s]*)?\)/g, (all, first, rest = "") =>
    sections.includes(first)
      ? `](/${first}${rest.replace(/\/(#|$)/, "$1")})`
      : `](https://comark-ui.onmax.me/${first}${rest})`,
  );
}

rmSync(content, { recursive: true, force: true });
mkdirSync(content, { recursive: true });

writeFileSync(
  join(content, "index.md"),
  `---\ntitle: comark-ui\ndescription: A spike of the comark-ui docs on @vite-hub/docs.\n---\n\n${sections.map((name) => `- [${name}](/${name})`).join("\n")}\n`,
);

sections.forEach((name, order) => {
  const from = join(repo, "packages", name, "docs");
  const to = join(content, name);
  mkdirSync(to, { recursive: true });
  for (const file of readdirSync(from, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".md") || file.startsWith("partials/")) continue;
    const { frontmatter, body } = page(readFileSync(join(from, file), "utf8"));
    if (file === "index.md")
      writeFileSync(
        join(to, ".navigation.yml"),
        stringify({
          title: frontmatter.title,
          icon: icon(frontmatter.icon ?? "box"),
          order,
          category: frontmatter.group ?? "Blocks",
        }),
        { flag: "w" },
      );
    const out = Object.fromEntries(Object.entries(frontmatter).filter(([key]) => kept.has(key)));
    if (out.icon) out.icon = icon(out.icon);
    mkdirSync(dirname(join(to, file)), { recursive: true });
    writeFileSync(join(to, file), `---\n${stringify(out)}---\n${links(body)}`);
  }
});

// The pages' images live in the old site's public folder.
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });
for (const file of ["after.png", "before.png", "dashboard.png", "favicon.svg"]) {
  const source = join(repo, "docs/public", file);
  if (existsSync(source)) cpSync(source, join(publicDir, file));
}
