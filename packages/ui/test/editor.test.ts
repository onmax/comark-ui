import { readdirSync } from "node:fs";
import { getSchema } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "@tiptap/y-tiptap";
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

  // Comark's writer prints a `table` node as a Markdown table, whatever it holds.
  it("refuses a component named like a Markdown block", async () => {
    expect(await checkMarkdown("::table{sort}\n```json\n[]\n```\n::\n")).toEqual({
      editable: false,
    });
  });

  // Comark's alert plugin reads the title into the callout's text, so the editor would move it into the body.
  it("refuses a callout with its own title", async () => {
    const { plugins } = html(offline);
    expect(await checkMarkdown("> [!NOTE] Heads up\n> Read this.\n", { plugins })).toEqual({
      editable: false,
    });
    expect((await checkMarkdown("> [!NOTE]\n> Read this.\n", { plugins })).editable).toBe(true);
  });

  // Without comark-footnotes the definition never reaches the tree, so only the page's own plugins see it go.
  it("refuses syntax only the page's plugins read", async () => {
    const markdown = "Note[^1]\n\n[^1]: Foot\n";
    expect((await checkMarkdown(markdown)).editable).toBe(true);
    const { plugins } = html(offline);
    expect(await checkMarkdown(markdown, { plugins })).toEqual({ editable: false });
  });
});

// Every example the docs show: the editor either opens it and saves it unchanged, or says it can't. Whatever it opens
// must fit the schema and survive the trip through Yjs that a collaborative room makes.
describe("the docs examples", async () => {
  const packages = readdirSync(new URL("../../", import.meta.url));
  const examples = await loadExamples(packages);
  const { plugins } = html(offline);

  it.each(examples.map((example) => [example.id, example.source] as const))(
    "%s",
    async (_, source) => {
      const { doc } = await fromMarkdown(source);
      const node = Node.fromJSON(schema, doc);
      node.check();
      const synced = yDocToProsemirrorJSON(prosemirrorJSONToYDoc(schema, doc));
      expect(Node.fromJSON(schema, synced).eq(node)).toBe(true);
      const check = await checkMarkdown(source, { plugins });
      if (check.editable) expect(await checkMarkdown(check.markdown, { plugins })).toEqual(check);
    },
  );
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
