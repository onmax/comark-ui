import { glob, readFile } from "node:fs/promises";
import { parseMarkdown, type Node } from "comark";
import { HTML_TAGS } from "comark-github";
import { describe, expect, it } from "vite-plus/test";
import html from "../src/html.ts";
import { componentInfo } from "../src/info.ts";
import vue from "../src/vue.ts";
import { isElement } from "../../../shared/nodes.ts";

// The components a document writes, by the names an editor reads: Comark's parse without the plugins that rename them.
const written = (nodes: Node[], found = new Set<string>()) => {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    found.add(node[0]);
    written(node.slice(2) as Node[], found);
  }
  return found;
};
// Markdown's own elements, slots, and raw HTML, which an example may write too.
const MARKDOWN = new Set([
  ..."a blockquote br code del em h1 h2 h3 h4 h5 h6 hr img input li ol p pre span strong table tbody td th thead tr ul template".split(
    " ",
  ),
  ...HTML_TAGS,
  "script",
]);

const root = `${import.meta.dirname}/../../..`;
const examples: string[] = [];
for await (const page of glob(["packages/*/docs/**/*.md", "packages/*/README.md"], {
  cwd: root,
  exclude: ["packages/lint/**", "packages/*-to-comark/**", "packages/chat/**"],
})) {
  const text = await readFile(`${root}/${page}`, "utf8");
  for (const [, , source] of text.matchAll(
    /^(`{3,}|~{3,})(?:md|markdown|mdc)\b.*\n([\s\S]*?)\n\1[ \t]*$/gm,
  ))
    examples.push(source!);
}

describe("componentInfo", () => {
  it("describes every component the docs' examples write, and only those", async () => {
    const info = componentInfo({ include: true });
    const found = new Set<string>();
    for (const example of examples) written((await parseMarkdown(example)).nodes, found);
    const components = [...found].filter((tag) => !MARKDOWN.has(tag));
    expect(components.filter((tag) => !info[tag])).toEqual([]);
    // And each name is one the preset reads, so a typo can't hide.
    const preset = html({ include: { read: () => undefined } });
    const known = new Set([...Object.keys(preset.components), ...preset.blocks, ...found]);
    expect(Object.keys(info).filter((tag) => !known.has(tag))).toEqual([]);
  });

  it("gives each block a label, a description, and typed props", () => {
    for (const [name, block] of Object.entries(componentInfo({ include: true }))) {
      // Lowercase with dashes, as Comark writes a component's name and ViteHub's `documents()` checks it.
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(block.label, name).toMatch(/^\S/);
      expect(block.description, name).toMatch(/^[A-Z].*\.$/);
      for (const [prop, spec] of Object.entries(block.props ?? {})) {
        expect(["string", "number", "boolean", "json"], `${name}.${prop}`).toContain(spec.type);
        if (spec.options && spec.default !== undefined)
          expect(spec.options, `${name}.${prop}`).toContain(spec.default);
      }
    }
  });

  it("follows the preset's options", () => {
    expect(componentInfo().embed?.props?.url?.type).toBe("string");
    expect(componentInfo().include).toBeUndefined();
    expect(componentInfo({ embed: false }).embed).toBeUndefined();
    expect(componentInfo().note).toBeDefined();
    expect(componentInfo({ github: { callouts: { blocks: false } } }).note).toBeUndefined();
    expect(componentInfo({ github: false }).note).toBeUndefined();
  });

  it("comes with each preset, for the blocks its renderer draws", () => {
    expect(html().componentInfo).toEqual(componentInfo());
    // Annotate has no Vue renderer.
    expect(html().componentInfo.screenshot).toBeDefined();
    expect(vue().componentInfo.screenshot).toBeUndefined();
    expect(vue({ embed: false }).componentInfo.embed).toBeUndefined();
  });
});
