import { readdirSync, readFileSync } from "node:fs";
import { getSchema } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "@tiptap/y-tiptap";
import { defineComarkPlugin, type MarkdownExitPlugin } from "comark";
import { describe, expect, it } from "vite-plus/test";
import { loadExamples } from "../../../docs/examples.ts";
import html from "../src/html.ts";
import {
  checkMarkdown,
  ComarkKit,
  createEditorCodec,
  fromMarkdown,
  toMarkdown,
} from "../src/editor.ts";

const schema = getSchema([ComarkKit]);
// No downloads and no Kroki, so the tests stay offline.
const offline = { chips: { download: false }, icon: { fetch: false }, diagrams: { draw: false } };
const roundTrip = async (markdown: string) => toMarkdown((await fromMarkdown(markdown)).doc);

describe("fromMarkdown and toMarkdown", () => {
  it("keeps bold and italic code through the actual schema and Yjs", async () => {
    const markdown = "See **`bold code`** and *`italic code`* and ***`both`***.\n";
    const codec = createEditorCodec();
    const schema = getSchema(codec.extensions());
    const doc = schema.nodeFromJSON(await codec.fromMarkdown(markdown));
    const shared = prosemirrorJSONToYDoc(schema, doc.toJSON());
    try {
      expect(await codec.toMarkdown(yDocToProsemirrorJSON(shared))).toBe(markdown);
      expect(await codec.verify(markdown)).toMatchObject({ writable: true });
    } finally {
      shared.destroy();
    }
  });

  it("keeps Markdown's blocks and marks", async () => {
    const markdown = [
      "# Hello **World** [link](https://x.dev)",
      'Some *em* ~~del~~ `code` and :badge[New]{color="green"} inline.',
      "> quote",
      "1. one\n2. two",
      '![alt](/a.png "title"){width="300"}',
      "![video](/v.mp4){loop muted}",
      "```ts [file.ts] {2}\nconst a = 1\n```",
      "---",
      "Hard  \nbreak",
    ].join("\n\n");
    expect(await roundTrip(markdown)).toBe(`${markdown}\n`);
  });

  it("keeps a task's text and check mark next to a nested list", async () => {
    const markdown = "- [ ] task\n- [x] done\n  - nested\n";
    expect(await roundTrip(markdown)).toBe(markdown);
    const { doc } = await fromMarkdown(markdown);
    expect(doc.content?.[0]).toMatchObject({
      type: "taskList",
      content: [{ attrs: { checked: false } }, { attrs: { checked: true } }],
    });
  });

  it("keeps components, their props, and their slots", async () => {
    const markdown =
      '::note{type="info"}\nInside **bold**\n\n:::card{to="/x"}\n#title\nCard title\n:::\n::\n';
    const { doc } = await fromMarkdown(markdown);
    expect(doc.content?.[0]).toMatchObject({
      type: "comarkBlock",
      attrs: { name: "note", props: { type: "info" } },
    });
    expect(await fromMarkdown(await toMarkdown(doc))).toEqual(await fromMarkdown(markdown));
  });

  // An id the parser derived from the heading would go stale, and be written out, once someone edits the heading.
  it("writes only the heading ids an author wrote", async () => {
    expect(await roundTrip("# Title\n\n## Custom {#here}\n")).toBe(
      "# Title\n\n## Custom {#here}\n",
    );
    const { doc } = await fromMarkdown("# Title\n");
    doc.content![0]!.content = [{ type: "text", text: "Renamed" }];
    expect(await toMarkdown(doc)).toBe("# Renamed\n");
  });

  it("escapes what someone types that Markdown would read as syntax", async () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "a *b* :badge[c]" }] }],
    };
    expect((await fromMarkdown(await toMarkdown(doc))).doc).toEqual(doc);
  });

  it("keeps front matter beside the document, not in it", async () => {
    const { doc, frontmatter } = await fromMarkdown("---\ntitle: Hi\n---\n\nBody\n");
    expect(frontmatter).toEqual({ title: "Hi" });
    expect(await toMarkdown(doc, { frontmatter })).toBe("---\ntitle: Hi\n---\n\nBody\n");
  });

  // A callout's title is its first line, so a soft break can't become a space.
  it("keeps soft line breaks where they were", async () => {
    expect(await roundTrip("Line one\nline two\n")).toBe("Line one\nline two\n");
  });

  // Comark's writer indents the blocks under a task by the width of `- [ ] `, which reads them back as code.
  it("keeps a quiz's options and the rationale under each", async () => {
    const markdown = [
      "::question{#order}",
      "What logs first?",
      "",
      "- [x] The promise",
      "  > Microtasks run first.",
      "- [ ] The timeout",
      "  > A timer queues a task.",
      "",
      "#explain",
      "The microtask queue empties first.",
      "::",
      "",
    ].join("\n");
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  it("keeps components flush, with their props on their line", async () => {
    const markdown = [
      '::compare{title="Toolbar"}',
      ':::screenshot{src="/a.png" alt="Before"}',
      '::::annotation{x="4" y="28" w="90" h="44" color="red"}',
      "Wraps.",
      "::::",
      ":::",
      "::",
      "",
    ].join("\n");
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  // Comark reads `:name{}` alone on its line like an empty `::name`, so the codec keeps which one the author wrote.
  it("keeps a component written alone on its line the way it was written", async () => {
    const markdown =
      ':comment{reply="ttl" by="Ana" note="Keeping it."}\n\n:badge[New]\n\n::embed{url="https://x.dev"}\n::\n';
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  // Comark's writer has its own handlers for `comment` and `table`, which would write these as an HTML comment and a
  // Markdown table.
  it("keeps components named like Markdown elements", async () => {
    const markdown =
      'Text :comment[span]{#c note="Why?"} more.\n\n::table{sort}\n```json\n[]\n```\n::\n';
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  it("keeps a callout's title on its marker line", async () => {
    const markdown = "> [!NOTE] Heads up\n> Read this.\n\n> [!TIP]\n> No title.\n";
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  it("keeps footnotes by the labels their author picked", async () => {
    const markdown = [
      "Pigeons[^count] and ^[a note *inline*].",
      "",
      "[^count]: Counted at nine.",
      "",
      "    From the window.",
      "",
    ].join("\n");
    expect(await roundTrip(markdown)).toBe(markdown);
    const { doc } = await fromMarkdown(markdown);
    expect(doc.content?.[1]).toMatchObject({
      type: "footnoteDefinition",
      attrs: { label: "count" },
    });
  });

  // comark-critic reads a substitution and a deletion beside an insertion as the same two nodes.
  it("keeps CriticMarkup, each mark as it was written", async () => {
    const markdown =
      "More than {--twelve--}{++fifteen++} pigeons {~~after~>before~~} the {==east **window**==}{>>Not west.<<}.\n";
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  it("keeps definition lists", async () => {
    const markdown = [
      "Pigeon count",
      ":   The number on the roof.",
      "",
      "    - Count once.",
      "",
      "Pizza vote",
      ":   Fridays.",
      ":   At noon.",
      "",
    ].join("\n");
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  // Comark's writer trims a code block's text, and a diff's last context line can be a single space.
  it("keeps the blank lines a code block ends with", async () => {
    const markdown = "```diff\n a\n \n```\n\n```txt\nb\n\n```\n";
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  it("keeps emphasis next to CJK punctuation", async () => {
    const markdown = "**この文は太字。**次の文は普通です。\n";
    expect(await roundTrip(markdown)).toBe(markdown);
  });

  it("reads an empty document as one empty paragraph and writes it as nothing", async () => {
    const { doc } = await fromMarkdown("");
    expect(doc).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(await toMarkdown(doc)).toBe("");
  });
});

describe("checkMarkdown", () => {
  it("lets the editor open what it writes back unchanged", async () => {
    expect(await checkMarkdown("# Title\n\nText with **bold**.\n")).toEqual({
      editable: true,
      markdown: "# Title\n\nText with **bold**.\n",
    });
  });

  it("refuses a comment inside a paragraph, which has nowhere to live", async () => {
    expect(await checkMarkdown("Text <!-- hidden --> more\n")).toEqual({ editable: false });
  });

  // Tiptap's task list is a bullet list.
  it("refuses an ordered task list", async () => {
    expect(await checkMarkdown("1. [ ] a\n   > b\n")).toEqual({ editable: false });
  });

  // The codec writes `~` escaped, so a page whose plugin reads `H~2~O` as a subscript would lose it.
  it("refuses syntax only the page's plugins read", async () => {
    const rule: MarkdownExitPlugin = (md) =>
      md.core.ruler.before("inline", "subscript", (state) => {
        for (const token of state.tokens)
          if (token.type === "inline") token.content = token.content.replace(/~(\w+)~/g, "$1");
      });
    const subscript = defineComarkPlugin(() => ({ name: "subscript", markdownItPlugins: [rule] }));
    const markdown = "H~2~O\n";
    expect((await checkMarkdown(markdown)).editable).toBe(true);
    expect(await checkMarkdown(markdown, { plugins: [subscript()] })).toEqual({ editable: false });
  });
});

// Every example the docs show, and the finished document of each skill, a quiz lesson among them: the editor opens it,
// fits it to the schema, takes it through Yjs as a collaborative room does, and saves it without changing what readers
// see.
describe("the docs examples", async () => {
  const packages = readdirSync(new URL("../../", import.meta.url));
  const examples = await loadExamples(packages);
  const skills = ["before-after-evidence", "review-document", "teach-lesson", "visual-explanation"];
  const documents = [
    ...examples.map((example) => [example.id, example.source] as const),
    ...skills.map(
      (skill) =>
        [
          `skill ${skill}`,
          readFileSync(
            new URL(`../../../skills/${skill}/references/example.md`, import.meta.url),
            "utf8",
          ),
        ] as const,
    ),
  ];
  const { plugins } = html(offline);

  it.each(documents)("%s", async (_, source) => {
    const { doc } = await fromMarkdown(source);
    const node = Node.fromJSON(schema, doc);
    node.check();
    const synced = yDocToProsemirrorJSON(prosemirrorJSONToYDoc(schema, doc));
    expect(Node.fromJSON(schema, synced).eq(node)).toBe(true);
    const check = await checkMarkdown(source, { plugins });
    expect(check.editable).toBe(true);
    if (check.editable) expect(await checkMarkdown(check.markdown, { plugins })).toEqual(check);
  });
});

describe("createEditorCodec", () => {
  const codec = createEditorCodec();

  it("reads and writes a room's body", async () => {
    const doc = await codec.fromMarkdown("# Title\n\n- [x] Done\n");
    expect(await codec.toMarkdown(doc)).toBe("# Title\n\n- [x] Done\n");
  });

  it("lets a room save what it writes back unchanged, and says what the first save writes", async () => {
    expect(await codec.verify("| a | b |\n| - | - |\n| 1 | 2 |\n")).toEqual({
      writable: true,
      canonical: "| a   | b   |\n| --- | --- |\n| 1   | 2   |\n",
    });
  });

  // A room stores the body alone, so a save would drop the front matter.
  it("opens a document with front matter read-only", async () => {
    expect(await codec.verify("---\ntitle: Hi\n---\n\nBody\n")).toEqual({ writable: false });
  });

  it("has the same schema as the kit, without the history a room keeps itself", () => {
    const shared = getSchema(codec.extensions());
    expect(Object.keys(shared.nodes)).toEqual(Object.keys(schema.nodes));
  });
});
