import { getSchema, type JSONContent } from "@tiptap/core";
import {
  prosemirrorJSONToYXmlFragment,
  updateYFragment,
  yXmlFragmentToProsemirrorJSON,
} from "@tiptap/y-tiptap";
import * as Y from "yjs";
import { describe, expect, it } from "vite-plus/test";
import { checkMarkdown, createEditorCodec, fromMarkdown, toMarkdown } from "../src/editor.ts";

const codec = createEditorCodec();
const schema = getSchema(codec.extensions());
const file =
  "---\ntitle: Release notes\nstatus: Draft\ntags:\n  - editor\n---\n\nFirst paragraph.\n";

// The host's side, laid out as ViteHub Realtime lays out a room: the body in a Y.XmlFragment, the fields in a Y.Map.
const body = (room: Y.Doc) => room.getXmlFragment("body");
const fields = (room: Y.Doc) => room.getMap<unknown>("fields");

async function open(stored: string) {
  const split = codec.split(stored);
  const check = await codec.verify(split.body);
  const content = await codec.fromMarkdown(split.body);
  const room = new Y.Doc();
  room.transact(() => {
    prosemirrorJSONToYXmlFragment(schema, content, body(room));
    for (const [key, value] of Object.entries(split.fields)) fields(room).set(key, value);
  });
  return { room, check };
}

function join(room: Y.Doc) {
  const other = new Y.Doc();
  Y.applyUpdate(other, Y.encodeStateAsUpdate(room));
  return other;
}

function sync(a: Y.Doc, b: Y.Doc) {
  const toB = Y.encodeStateAsUpdate(a, Y.encodeStateVector(b));
  const toA = Y.encodeStateAsUpdate(b, Y.encodeStateVector(a));
  Y.applyUpdate(b, toB);
  Y.applyUpdate(a, toA);
}

function edit(room: Y.Doc, change: (doc: JSONContent) => JSONContent) {
  const next = schema.nodeFromJSON(change(yXmlFragmentToProsemirrorJSON(body(room))));
  updateYFragment(room, body(room), next, { mapping: new Map(), isOMark: new Map() });
}

const paragraph = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const append = (text: string) => (doc: JSONContent) => ({
  ...doc,
  content: [...(doc.content ?? []), paragraph(text)],
});

async function save(room: Y.Doc) {
  const markdown = await codec.toMarkdown(yXmlFragmentToProsemirrorJSON(body(room)));
  return codec.join({ body: markdown, fields: fields(room).toJSON() });
}

describe("frontmatter in a collaborative room", () => {
  it("splits the frontmatter into the room's fields and joins the file back unchanged", async () => {
    expect(codec.split(file)).toEqual({
      body: "First paragraph.\n",
      fields: { title: "Release notes", status: "Draft", tags: ["editor"] },
    });
    const { room, check } = await open(file);
    expect(check).toEqual({ writable: true, canonical: "First paragraph.\n" });
    expect(await save(room)).toBe(file);
  });

  it("keeps the frontmatter through a body edit and a reopen", async () => {
    const { room } = await open(file);
    edit(room, append("Second paragraph."));
    const saved = await save(room);
    expect(saved).toBe(`${file}\nSecond paragraph.\n`);

    const reopened = await open(saved);
    expect(reopened.check.writable).toBe(true);
    expect(fields(reopened.room).toJSON()).toEqual(fields(room).toJSON());
    expect(await save(reopened.room)).toBe(saved);
  });

  it("keeps the frontmatter when the body is emptied", async () => {
    const { room } = await open(file);
    edit(room, (doc) => ({ ...doc, content: [{ type: "paragraph" }] }));
    const saved = await save(room);
    expect(saved).toBe("---\ntitle: Release notes\nstatus: Draft\ntags:\n  - editor\n---\n");
    expect(codec.split(saved).fields).toEqual(fields(room).toJSON());
  });

  it("sends a frontmatter change to a second collaborator", async () => {
    const { room: first } = await open(file);
    const second = join(first);
    fields(first).set("status", "Published");
    sync(first, second);
    expect(await save(second)).toBe(file.replace("Draft", "Published"));
  });

  it("merges a body edit and frontmatter edits made at the same time", async () => {
    const { room: first } = await open(file);
    const second = join(first);
    edit(first, append("From the first."));
    fields(first).set("owner", "onmax");
    edit(second, (doc) => ({ ...doc, content: [paragraph("Rewritten by the second.")] }));
    fields(second).set("status", "Review");
    sync(first, second);

    const merged = await save(first);
    expect(await save(second)).toBe(merged);
    expect(codec.split(merged).fields).toEqual({
      title: "Release notes",
      status: "Review",
      tags: ["editor"],
      owner: "onmax",
    });
    expect(codec.split(merged).body).toContain("From the first.");
    expect(codec.split(merged).body).toContain("Rewritten by the second.");
  });

  it.each([
    ["an empty block", "---\n---\n\nBody\n", /block is empty/],
    ["a blank block", "---\n  \n---\n\nBody\n", /block is empty/],
    ["only comments", "---\n# draft\n---\n\nBody\n", /only YAML comments/],
    ["a comment beside a key", "---\ntitle: Hi # short\n---\n\nBody\n", /has YAML comments/],
    ["plain text", "---\njust text\n---\n\nBody\n", /a YAML string/],
    ["a list", "---\n- a\n- b\n---\n\nBody\n", /a YAML list/],
    ["invalid YAML", "---\ntitle: [a\n---\n\nBody\n", /isn't valid YAML \(.+\)/],
  ])("opens frontmatter with %s read-only and says why", async (_, stored, reason) => {
    expect(codec.split(stored)).toEqual({ body: stored, fields: {} });
    const { room, check } = await open(stored);
    expect(await save(room)).toContain("Body");
    expect(check).toEqual({
      writable: false,
      issues: [{ message: expect.stringMatching(reason) }],
    });
    expect(await checkMarkdown(stored)).toEqual({
      editable: false,
      reason: expect.stringMatching(reason),
    });
  });

  it("keeps a # inside a quoted value", async () => {
    const stored = '---\ntitle: "Fix #12"\n---\n\nBody\n';
    const { room, check } = await open(stored);
    expect(check.writable).toBe(true);
    expect(await save(room)).toBe("---\ntitle: 'Fix #12'\n---\n\nBody\n");
  });

  it("won't save a body that still holds its frontmatter", async () => {
    expect(await codec.verify(file)).toEqual({
      writable: false,
      issues: [{ message: expect.stringContaining("`split()`") }],
    });
  });
});

describe("toMarkdown with frontmatter", () => {
  it("keeps the frontmatter's --- lines when the body is empty", async () => {
    const { frontmatter } = await fromMarkdown("---\ntitle: Hi\n---\n\nBody\n");
    const markdown = await toMarkdown(
      { type: "doc", content: [{ type: "paragraph" }] },
      { frontmatter },
    );
    expect(markdown).toBe("---\ntitle: Hi\n---\n");
    expect((await fromMarkdown(markdown)).frontmatter).toEqual(frontmatter);
  });
});
