import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSlug from "rehype-slug";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkSqueezeParagraphs from "remark-squeeze-paragraphs";
import type { ComarkPlugin } from "comark";
import type { Pluggable } from "unified";
import { describe, expect, it } from "vite-plus/test";
import { compare, comarkHtml, comarkSetup, remarkHtml } from "./support/index.ts";
import {
  autolinkHeadings,
  externalLinks,
  npm2yarn,
  readingTime,
  slug,
  squeezeParagraphs,
  unwrapImages,
} from "../src/plugins/index.ts";
import { parseMarkdown } from "comark";

const IDS = new Set<string>();
const headings =
  "# Hello, World!\n\n## C++ & C#\n\n## Emoji 🚀 rocket\n\n## Hello, World!\n\n## Custom {#mine}\n\nText with [a link](https://example.com).\n";

async function same(
  markdown: string,
  remark: { remarkPlugins?: Pluggable[]; rehypePlugins?: Pluggable[] },
  plugins: ComarkPlugin[],
) {
  const expected = await remarkHtml(markdown, remark);
  const actual = await comarkHtml(markdown, comarkSetup({ plugins }));
  return compare(expected, actual, { benign: IDS }).differences;
}

describe("ports render like the plugins they replace", () => {
  it("slug", async () => {
    expect(
      await same(
        "# Hello, World!\n\n## C++ & C#\n\n## Emoji 🚀 rocket\n\n## Hello, World!\n\n## `code` *em*\n",
        { rehypePlugins: [rehypeSlug] },
        [slug()],
      ),
    ).toEqual([]);
  });

  it.each([
    ["prepend", {}],
    ["append", { behavior: "append" }],
    ["wrap", { behavior: "wrap" }],
    ["before", { behavior: "before" }],
    [
      "after",
      {
        behavior: "after",
        properties: { className: ["anchor"] },
        content: { type: "text", value: "#" },
      },
    ],
  ] as const)("autolinkHeadings %s", async (_, options) => {
    const markdown = headings.replace(" {#mine}", "");
    expect(
      await same(markdown, { rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, options]] }, [
        slug(),
        autolinkHeadings(options),
      ]),
    ).toEqual([]);
  });

  it.each([
    ["defaults", {}],
    ["target and rel", { target: "_blank", rel: "noopener noreferrer" }],
    ["content", { content: { type: "text", value: " ↗" } }],
  ] as const)("externalLinks %s", async (_, options) => {
    const markdown =
      "[out](https://example.com) [in](/docs) [mail](mailto:a@b.co) [proto](//cdn.example.com/x) https://bare.example.com\n";
    expect(
      await same(markdown, { rehypePlugins: [[rehypeExternalLinks, options]] }, [
        externalLinks(options),
      ]),
    ).toEqual([]);
  });

  it("unwrapImages", async () => {
    const markdown =
      "![a](a.png)\n\n![b](b.png) ![c](c.png)\n\n[![d](d.png)](https://example.com)\n\nText ![e](e.png)\n";
    expect(await same(markdown, { rehypePlugins: [rehypeUnwrapImages] }, [unwrapImages()])).toEqual(
      [],
    );
  });

  it("squeezeParagraphs", async () => {
    expect(
      await same("a\n\n<!-- x -->\n\nb\n", { remarkPlugins: [remarkSqueezeParagraphs] }, [
        squeezeParagraphs(),
      ]),
    ).toEqual([]);
  });
});

describe("ports with no rendered counterpart", () => {
  it("npm2yarn writes a code group per package manager", async () => {
    const document = await parseMarkdown("```bash npm2yarn\nnpm install --save react\n```\n", {
      ...comarkSetup({ plugins: [npm2yarn()] }).options,
      plugins: comarkSetup({ plugins: [npm2yarn()] }).plugins,
    });
    const group = document.nodes[0] as unknown[];
    expect(group[0]).toBe("code-group");
    expect(JSON.stringify(group)).toContain("yarn add react");
    expect(JSON.stringify(group)).toContain("pnpm add react");
  });

  it("readingTime counts words into meta", async () => {
    const setup = comarkSetup({ plugins: [readingTime()] });
    const document = await parseMarkdown("word ".repeat(400), {
      ...setup.options,
      plugins: setup.plugins,
    });
    expect(document.meta.readingTime).toMatchObject({ words: 400, text: "2 min read" });
  });
});

describe("ports on the review's inputs", () => {
  it.each([
    ["autolink heading properties", "# One\n", { headingProperties: { id: "changed" } }],
    [
      "autolink wrap content",
      "# One\n",
      { behavior: "wrap", content: { type: "text", value: "!" } },
    ],
    [
      "autolink group",
      "# One\n",
      {
        behavior: "before",
        group: { type: "element", tagName: "div", properties: { className: ["g"] }, children: [] },
      },
    ],
  ] as const)("%s", async (_, markdown, options) => {
    expect(
      await same(markdown, { rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, options]] }, [
        slug(),
        autolinkHeadings(options as never),
      ]),
    ).toEqual([]);
  });

  it("external links with function options", async () => {
    const options = { target: () => "_blank", content: () => ({ type: "text", value: "↗" }) };
    expect(
      await same("[A](https://a.test)\n", { rehypePlugins: [[rehypeExternalLinks, options]] }, [
        externalLinks(options as never),
      ]),
    ).toEqual([]);
  });

  it("unwrap only real images", async () => {
    expect(
      await same(
        '<a href="x"></a>\n\n[![a](a.png)](/x)\n',
        { rehypePlugins: [rehypeUnwrapImages] },
        [unwrapImages()],
      ),
    ).toEqual([]);
  });

  it("slug treats an empty id as missing", async () => {
    expect(
      await same('<h2 id="">A</h2>\n\n## A\n', { rehypePlugins: [rehypeSlug] }, [slug()]),
    ).toEqual([]);
  });

  it("squeeze keeps authored HTML", async () => {
    expect(
      await same("<p> </p>\n\nx\n", { remarkPlugins: [remarkSqueezeParagraphs] }, [
        squeezeParagraphs(),
      ]),
    ).toEqual([]);
  });

  it("npm2yarn leaves examples inside code alone and converts blocks in quotes", async () => {
    const setup = comarkSetup({ plugins: [npm2yarn()] });
    const parse = (markdown: string) =>
      parseMarkdown(markdown, { ...setup.options, plugins: setup.plugins });
    const example = "````md\n```bash npm2yarn\nnpm install react\n```\n````\n";
    expect(JSON.stringify((await parse(example)).nodes)).not.toContain("code-group");
    expect(
      JSON.stringify((await parse("> ```bash npm2yarn\n> npm install react\n> ```\n")).nodes),
    ).toContain("yarn add react");
  });

  it("readingTime matches the reading-time package", async () => {
    const setup = comarkSetup({ plugins: [readingTime()] });
    const document = await parseMarkdown("word ".repeat(201), {
      ...setup.options,
      plugins: setup.plugins,
    });
    expect(document.meta.readingTime).toMatchObject({ text: "1 min read", words: 201 });
  });
});

describe("ports keep their options' contracts", () => {
  type Hast = {
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: { value?: string }[];
  };
  it.each([
    ["a test that rejects", { test: () => false }],
    ["properties", { properties: { target: "_blank" } }],
    ["a null rel, which means the default", { rel: null }],
    [
      "a callback that reads the link's children",
      { target: (node: Hast) => (node.children?.[0]?.value === "One" ? "_blank" : undefined) },
    ],
  ])("external links with %s", async (_, options) => {
    const markdown = "[One](https://example.com) and [two](https://example.org)\n";
    expect(
      await same(markdown, { rehypePlugins: [[rehypeExternalLinks, options]] }, [
        externalLinks(options as never),
      ]),
    ).toEqual([]);
  });

  it.each([
    ["a test that rejects", { test: () => false }],
    ["content from a callback", { content: () => ({ type: "text", value: "#" }) }],
    ["properties from a callback", { properties: (node: Hast) => ({ dataLevel: node.tagName }) }],
  ])("autolink headings with %s", async (_, options) => {
    expect(
      await same(
        "# One\n\n## Two\n",
        { rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, options]] },
        [slug(), autolinkHeadings(options as never)],
      ),
    ).toEqual([]);
  });

  it("counts reading time over Markdown text, not inline code or raw HTML", async () => {
    const words = async (markdown: string) =>
      (
        (
          await parseMarkdown(markdown, {
            ...comarkSetup({ plugins: [readingTime()] }).options,
            plugins: comarkSetup({ plugins: [readingTime()] }).plugins,
          })
        ).meta as { readingTime: { words: number } }
      ).readingTime.words;
    expect(await words("one `two three` four")).toBe(2);
    expect(await words("<div>one two three</div>")).toBe(0);
  });
});

describe("setup matches remark on review inputs", () => {
  it.each([
    ["frontmatter after a byte order mark", "﻿---\ntitle: Hi\n---\nBody\n"],
    [
      "a repeated footnote definition, where the first wins",
      "x[^a]\n\n[^a]: first\n\n[^a]: second\n",
    ],
    ["a tag an HTML block opens, closed in a later block", "<Foo>\n\nx\n"],
    ["two lines of text inside an open HTML element", "<div>\n\na\nb\n"],
    ["an inline tag left open in a heading", "## a<b>\n"],
    ["an inline tag left open in a paragraph", "GET /apps/<id>\n\nNext.\n"],
    ["a Markdown image with empty alt text", "![](a.png)\n"],
  ])("%s", async (_, markdown) => {
    expect(
      compare(await remarkHtml(markdown), await comarkHtml(markdown, comarkSetup())).differences,
    ).toEqual([]);
  });
});
