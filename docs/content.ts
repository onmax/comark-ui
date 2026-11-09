// Writes docs/content/, the folder @vite-hub/docs reads: docs/pages as it is, and each package's docs/ as a section
// under its name. Its frontmatter schema is strict, so each page keeps only the fields it knows, and a Doctor rule page,
// which has none, takes its title from the rule's catalog entry.
import { globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse, stringify } from "yaml";
import { catalog, type RuleInfo } from "../packages/lint/src/rules/index.ts";
import { categories, packageOrder, railGroupOf, siteSections } from "./sections.ts";

const repo = new URL("../", import.meta.url);
const content = new URL("content/", import.meta.url);

// Everything else the old site read from frontmatter: search keywords, taglines, blurbs, credits, and installers.
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
// scribble-loop is the landing's own SVG (landing.ts); Lucide has none, so the rail would draw nothing.
const icon = (name: string) =>
  name === "scribble-loop"
    ? "i-lucide-pen-tool"
    : name.includes(":") || name.startsWith("i-")
      ? name
      : `i-lucide-${name}`;
const plain = (text: string) =>
  text.replace(/`([^`]*)`/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1");

const rules = Object.fromEntries(
  Object.entries(catalog as Record<string, RuleInfo>).map(([rule, info]) => [
    `doctor/${rule.replace(/^comark\//, "")}`,
    { rule, info },
  ]),
);

function split(source: string) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!match) return { frontmatter: {} as Record<string, unknown>, body: source };
  return {
    frontmatter: (parse(match[1]!) ?? {}) as Record<string, unknown>,
    body: source.slice(match[0].length),
  };
}

function page(file: URL, slug: string) {
  const { frontmatter, body } = split(readFileSync(file, "utf8"));
  const out: Record<string, unknown> = Object.fromEntries(
    Object.entries(frontmatter).filter(([key]) => kept.has(key)),
  );
  const rule = rules[slug];
  if (rule) {
    out.title = rule.rule;
    out.description = plain(rule.info.title);
    out.navigation = { title: rule.rule.split("/").at(-1) };
  }
  if (typeof out.icon === "string") out.icon = icon(out.icon);
  if (typeof frontmatter.label === "string") out.navigation = { title: frontmatter.label };
  out.title ??= /^# (.+)$/m.exec(body)?.[1] ?? slug.split("/").at(-1);
  return { frontmatter, text: `---\n${stringify(out)}---\n${body}` };
}

function write(path: string, text: string) {
  const to = new URL(path, content);
  mkdirSync(dirname(to.pathname), { recursive: true });
  writeFileSync(to, text);
}

rmSync(content, { recursive: true, force: true });

const pages = new URL("docs/pages/", repo);
for (const file of globSync("**/*.md", { cwd: pages.pathname })) {
  if (file.startsWith("partials/")) continue;
  write(file, page(new URL(file, pages), file.replace(/(^|\/)?index\.md$|\.md$/, "")).text);
}
// A sidebar lists its sections in this order, so they sort by category first: each category's heading shows once. In
// a category, the site's own sections come before its packages, in packageOrder.
const rank = (category: string, at: number) => categories.indexOf(category) * 1000 + at;
for (const [id, { last, ...section }] of Object.entries(siteSections))
  write(
    `${id}/.navigation.yml`,
    stringify({
      ...section,
      order: rank(section.category, last ? 999 : Object.keys(siteSections).indexOf(id)),
    }),
  );

// A rule page sits in its package's group in the Doctor sidebar, after the core rules.
for (const [slug, { rule }] of Object.entries(rules)) {
  const group = rule.split("/").length > 2 ? rule.split("/")[1]! : "core";
  const path = new URL(`${slug.replace(/^doctor\//, "")}.md`, new URL("doctor/", content));
  const text = readFileSync(path, "utf8").replace(
    /^navigation:\n/m,
    `navigation:\n  group: ${group === "core" ? "Core" : group}\n`,
  );
  writeFileSync(path, text);
}

packageOrder.forEach((name, order) => {
  const docs = new URL(`packages/${name}/docs/`, repo);
  const files = globSync("**/*.md", { cwd: docs.pathname }).filter(
    (file) => !file.startsWith("partials/"),
  );
  if (!files.length) return;
  for (const file of files) {
    const { frontmatter, text } = page(new URL(file, docs), `${name}/${file}`);
    write(`${name}/${file}`, text);
    if (file === "index.md") {
      const category = typeof frontmatter.group === "string" ? frontmatter.group : "Docs blocks";
      write(
        `${name}/.navigation.yml`,
        stringify({
          title: frontmatter.title,
          icon: icon(typeof frontmatter.icon === "string" ? frontmatter.icon : "box"),
          order: rank(category, 100 + order),
          category,
          group: railGroupOf(category),
        }),
      );
    }
  }
});
