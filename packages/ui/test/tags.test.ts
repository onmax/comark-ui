import { glob, readFile } from "node:fs/promises";
import { parseMarkdown, type Node } from "comark";
import { describe, expect, it } from "vite-plus/test";
import html, { type PresetOptions } from "../src/html.ts";
import vue from "../src/vue.ts";
import { isElement } from "../../../shared/nodes.ts";

const offline: PresetOptions = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
};

const tagsIn = (nodes: Node[], found = new Set<string>()) => {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    found.add(node[0]);
    tagsIn(node.slice(2) as Node[], found);
  }
  return found;
};

// Every Markdown example in the packages' docs and READMEs, which together show each plugin's syntax. The linter's
// pages are left out, since their examples write unknown components on purpose.
const root = `${import.meta.dirname}/../../..`;
const examples: string[] = [];
for await (const page of glob(["packages/*/docs/**/*.md", "packages/*/README.md"], {
  cwd: root,
  exclude: ["packages/lint/**"],
})) {
  const text = await readFile(`${root}/${page}`, "utf8");
  for (const [, , source] of text.matchAll(
    /^(`{3,}|~{3,})(?:md|markdown|mdc)\b.*\n([\s\S]*?)\n\1[ \t]*$/gm,
  ))
    examples.push(source!);
}

describe("tags", () => {
  it("lists every element a parsed document holds that no component draws", async () => {
    // Include is off by default, which leaves `::include` as an unknown block; on, it reads no files here.
    const { plugins, components, tags } = html({ ...offline, include: { read: () => undefined } });
    const allowed = new Set([...tags, ...Object.keys(components)]);
    const found = new Set<string>();
    for (const example of examples)
      tagsIn((await parseMarkdown(example, { plugins })).nodes, found);
    expect(examples.length).toBeGreaterThan(300);
    expect([...found].filter((tag) => !allowed.has(tag))).toEqual([]);
  });

  it("follows the options: a plugin that's off adds none of its tags or blocks", () => {
    expect(html().tags).toEqual(expect.arrayContaining(["kbd", "quiz-option", "tabs-item"]));
    expect(html().blocks).toEqual(expect.arrayContaining(["code-group", "stats", "ref"]));
    const off = html({ quiz: false, tabs: false, github: { html: false } });
    expect(off.tags).not.toContain("quiz-option");
    expect(off.tags).not.toContain("tabs-item");
    expect(off.tags).not.toContain("abbr");
    expect(off.blocks).not.toContain("code-group");
    // Quiz has no Vue renderer, so the Vue preset leaves it out.
    expect(vue().tags).not.toContain("quiz-option");
  });
});
