import { getSchema } from "@tiptap/core";
import { Transform } from "@tiptap/pm/transform";
import { describe, expect, it } from "vite-plus/test";
import { createEditorCodec } from "../src/editor/codec.ts";

describe("definition-list edits", () => {
  const codec = createEditorCodec();
  const schema = getSchema(codec.extensions());
  const term = (text: string) => schema.node("definitionTerm", null, schema.text(text));
  const description = (text: string) =>
    schema.node("definitionDescription", null, schema.node("paragraph", null, schema.text(text)));

  it("rejects descriptions without a term and terms without descriptions", () => {
    for (const content of [
      [description("Only definition")],
      [description("Leading definition"), term("Term"), description("Definition")],
      [term("Only term")],
      [term("First"), term("Second"), description("Definition")],
      [term("Term"), description("Definition"), term("Trailing term")],
    ]) {
      expect(() => schema.node("definitionList", null, content)).toThrow();
    }
  });

  it("prevents removing a term alone and round-trips removal of a complete entry", async () => {
    const firstTerm = term("First");
    const firstDescription = description("First definition");
    const list = schema.node("definitionList", null, [
      firstTerm,
      firstDescription,
      term("Second"),
      description("Second definition"),
      description("Another definition"),
    ]);
    expect(list.canReplace(0, 1)).toBe(false);

    const doc = schema.node("doc", null, list);
    const edited = new Transform(doc).delete(
      1,
      1 + firstTerm.nodeSize + firstDescription.nodeSize,
    ).doc;
    edited.check();
    const markdown = await codec.toMarkdown(edited.toJSON());
    expect(markdown).toBe("Second\n:   Second definition\n:   Another definition\n");
    const reopened = schema.nodeFromJSON(await codec.fromMarkdown(markdown));
    expect(reopened.eq(edited)).toBe(true);
  });
});
