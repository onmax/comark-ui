import { Extension, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import StarterKit, { type StarterKitOptions } from "@tiptap/starter-kit";

export interface ComarkKitOptions {
  /**
   * Passed to StarterKit. A collaborative editor turns `undoRedo` off, since Yjs keeps its own history. Comark has no
   * underline syntax, so `underline` is always off.
   */
  starterKit?: Partial<StarterKitOptions>;
}

// Every node and mark the codec writes, so each keeps the Comark attributes it has no field for.
const typesWithProps = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "image",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "bold",
  "italic",
  "strike",
  "code",
  "link",
];

/** Comark attributes the editor doesn't show, carried as they were parsed so writing the node back keeps them. */
const props = { default: null, rendered: false };

const name = (attribute: string) => ({
  default: "",
  parseHTML: (element: HTMLElement) => element.getAttribute(attribute) ?? "",
  renderHTML: (attrs: Record<string, unknown>) => ({ [attribute]: attrs.name }),
});

/** A block component, `::name`, or a block of raw HTML. Its children are blocks and its `#slot`s. */
export const ComarkBlock = Node.create({
  name: "comarkBlock",
  group: "block",
  content: "(block | comarkSlot)*",
  defining: true,
  addAttributes: () => ({ name: name("data-comark-block"), props }),
  parseHTML: () => [{ tag: "div[data-comark-block]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes, 0],
});

/** A component's named slot, `#name`. */
export const ComarkSlot = Node.create({
  name: "comarkSlot",
  content: "block*",
  defining: true,
  addAttributes: () => ({ name: name("data-comark-slot"), props }),
  parseHTML: () => [{ tag: "div[data-comark-slot]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes, 0],
});

/** An inline component, `:name[text]{props}`, or inline raw HTML. */
export const ComarkInline = Node.create({
  name: "comarkInline",
  group: "inline",
  inline: true,
  content: "inline*",
  addAttributes: () => ({ name: name("data-comark-inline"), props }),
  parseHTML: () => [{ tag: "span[data-comark-inline]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", HTMLAttributes, 0],
});

/** An HTML comment between blocks. */
export const ComarkComment = Node.create({
  name: "comarkComment",
  group: "block",
  atom: true,
  addAttributes: () => ({
    text: {
      default: "",
      parseHTML: (element: HTMLElement) => element.getAttribute("data-comark-comment") ?? "",
      renderHTML: (attrs: Record<string, unknown>) => ({ "data-comark-comment": attrs.text }),
    },
  }),
  parseHTML: () => [{ tag: "div[data-comark-comment]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes],
});

/**
 * The schema `fromMarkdown` and `toMarkdown` read and write: StarterKit's nodes and marks, task lists, inline images,
 * tables, and Comark's components, slots, and comments. It needs no DOM, so a server can load it to convert a document
 * for a collaborative room.
 */
export const ComarkKit = Extension.create<ComarkKitOptions>({
  name: "comarkKit",
  addOptions: () => ({ starterKit: {} }),
  addGlobalAttributes: () => [{ types: typesWithProps, attributes: { props } }],
  addExtensions() {
    return [
      StarterKit.configure({ ...this.options.starterKit, underline: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: true }),
      TableKit.configure({ table: { resizable: false } }),
      ComarkBlock,
      ComarkSlot,
      ComarkInline,
      ComarkComment,
    ];
  },
});
