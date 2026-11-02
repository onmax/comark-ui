import abbr from "markdown-it-abbr";
import anchor from "markdown-it-anchor";
import attrs from "markdown-it-attrs";
import container from "markdown-it-container";
import deflist from "markdown-it-deflist";
import { full as emoji } from "markdown-it-emoji";
import footnote from "markdown-it-footnote";
import ins from "markdown-it-ins";
import linkAttributes from "markdown-it-link-attributes";
import mark from "markdown-it-mark";
import sub from "markdown-it-sub";
import sup from "markdown-it-sup";
import taskLists from "markdown-it-task-lists";
import texmath from "markdown-it-texmath";
import katex from "katex";
import { describe, expect, it } from "vite-plus/test";
import { both, compare } from "./support/index.ts";

// Each plugin runs on markdown-it and, through markdownItPlugin(), on Comark; the HTML must match once normalized.
const cases: [string, [unknown, ...unknown[]][], string][] = [
  [
    "markdown-it-container",
    [[container, "warning"]],
    "::: warning Careful\nSome *text*\n\n- a list\n:::\n",
  ],
  [
    "markdown-it-container with its own renderer",
    [
      [
        container,
        "details",
        {
          render: (tokens: { nesting: number; info: string }[], index: number) =>
            tokens[index]!.nesting === 1
              ? `<details><summary>${tokens[index]!.info.trim().slice(8)}</summary>\n`
              : "</details>\n",
        },
      ],
    ],
    "::: details More\nHidden *text*\n:::\n",
  ],
  [
    "markdown-it-footnote",
    [[footnote]],
    "One[^a], two[^b], inline^[note].\n\n[^a]: First *note*.\n\n    More.\n\n[^b]: Second.\n\n- In a list[^a]\n",
  ],
  [
    "markdown-it-sub, -sup, -mark, -ins",
    [[sub], [sup], [mark], [ins]],
    "H~2~O, x^2^, ==marked==, ++inserted++\n",
  ],
  ["markdown-it-abbr", [[abbr]], "*[HTML]: Hyper Text\n\nThe HTML spec.\n"],
  ["markdown-it-deflist", [[deflist]], "Term\n: Definition *one*\n\nOther\n\n: Loose definition\n"],
  [
    "markdown-it-anchor",
    [[anchor, { permalink: anchor.permalink.headerLink() }]],
    "# Hello World\n\n## Hello World\n",
  ],
  [
    "markdown-it-anchor's legacy permalink",
    [[anchor, { permalink: true, permalinkSymbol: "#", permalinkClass: "direct-link" }]],
    "# Hello\n",
  ],
  ["markdown-it-attrs", [[attrs]], "# Title {#id .big}\n\nA paragraph {.lead data-x=1}\n"],
  ["markdown-it-task-lists", [[taskLists]], "- [ ] todo\n- [x] done\n"],
  ["markdown-it-emoji", [[emoji]], "Ship it :rocket: :) and :not_an_emoji:\n"],
  [
    "markdown-it-link-attributes",
    [[linkAttributes, { attrs: { target: "_blank", rel: "noopener" } }]],
    "[a](https://a.com)\n",
  ],
  ["markdown-it-texmath", [[texmath, { engine: katex }]], "Inline $x^2$ and\n\n$$\ny = 1\n$$\n"],
];

describe("markdownItPlugin", () => {
  it.each(cases)("runs %s like markdown-it", async (_, plugins, markdown) => {
    for (const syntax of ["comark", "plain"] as const) {
      const { markdownIt, comark } = both({ syntax, html: true, plugins });
      expect(compare(markdownIt(markdown), await comark(markdown)).differences).toEqual([]);
    }
  });

  type Md = {
    renderer: { rules: Record<string, unknown> };
    core: {
      ruler: { push: (name: string, fn: (state: { env: Record<string, string> }) => void) => void };
    };
    set: (options: object) => void;
  };
  it.each<[string, (md: Md) => void, string]>([
    [
      "a renderer that reads what a core rule left in the environment",
      (md) => {
        md.core.ruler.push("label", (state) => {
          state.env.label = "saved";
        });
        md.renderer.rules.code_inline = (
          _: unknown,
          __: number,
          ___: unknown,
          env: Record<string, string>,
        ) => `<code>${env.label}</code>`;
      },
      "Press `x`.\n",
    ],
    [
      "a closing rule alone",
      (md) => void (md.renderer.rules.paragraph_close = () => "</p><hr>\n"),
      "a\n\nb\n",
    ],
    [
      "inline output alone in its paragraph",
      (md) => void (md.renderer.rules.code_inline = () => "<kbd>foo</kbd>"),
      "`foo`\n",
    ],
    [
      "a highlight function a plugin sets",
      (md) => md.set({ highlight: () => "<b>lit</b>" }),
      "```js\nx\n```\n",
    ],
    [
      "a strikethrough drawn its own way",
      (md) => {
        md.renderer.rules.s_open = () => "<mark>";
        md.renderer.rules.s_close = () => "</mark>";
      },
      "~~a~~\n",
    ],
    [
      "code that shows an HTML comment",
      (md) =>
        void (md.renderer.rules.fence = () => "<pre><code>&lt;!-- a --&gt;\nb\n</code></pre>\n"),
      "```\nx\n```\n",
    ],
    [
      "code whose text is only newlines",
      (md) => void (md.renderer.rules.fence = () => "<pre><code>\n\n</code></pre>\n"),
      "```\nx\n```\n",
    ],
  ])("draws %s like markdown-it", async (_, plugin, markdown) => {
    for (const html of [true, false]) {
      const { markdownIt, comark } = both({ html, plugins: [[plugin]] });
      expect(compare(markdownIt(markdown), await comark(markdown)).differences).toEqual([]);
    }
  });

  it("runs the project's own plugin, renderer rule included", async () => {
    const shout = (md: { renderer: { rules: Record<string, unknown> } }) => {
      md.renderer.rules.code_inline = (tokens: { content: string }[], index: number) =>
        `<kbd>${tokens[index]!.content.toUpperCase()}</kbd>`;
    };
    const { markdownIt, comark } = both({ plugins: [[shout]] });
    expect(
      compare(markdownIt("Press `ctrl`.\n"), await comark("Press `ctrl`.\n")).differences,
    ).toEqual([]);
  });
});
