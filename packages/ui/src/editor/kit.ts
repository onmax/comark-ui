import { Extension, Mark, Node } from "@tiptap/core";
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
  "definitionList",
  "definitionTerm",
  "definitionDescription",
];

function readProps(element: HTMLElement) {
  try {
    return JSON.parse(element.getAttribute("data-comark-props") ?? "null");
  } catch {
    return null;
  }
}

/**
 * Comark attributes the editor doesn't show, carried as they were parsed so writing the node back keeps them. They're
 * in the HTML too, since the clipboard copies nodes as HTML: a pasted `::screenshot` keeps its `src`.
 */
const props = {
  default: null,
  parseHTML: readProps,
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs.props ? { "data-comark-props": JSON.stringify(attrs.props) } : {},
};

const name = (attribute: string) => ({
  default: "",
  parseHTML: (element: HTMLElement) => element.getAttribute(attribute) ?? "",
  renderHTML: (attrs: Record<string, unknown>) => ({ [attribute]: attrs.name }),
});

// The extensions comark-media plays, so a dropped video shows as one while it's edited.
function mediaKind(src: string | null) {
  const path = (src ?? "").replace(/[?#].*$/, "");
  return /\.(?:mp4|webm|mov|m4v)$/i.test(path)
    ? "video"
    : /\.(?:mp3|wav|ogg|m4a)$/i.test(path)
      ? "audio"
      : undefined;
}

/** Markdown's image, inline as Comark parses it, drawn as a player when comark-media would play it. */
export const ComarkImage = Image.extend({
  renderHTML({ node, HTMLAttributes }) {
    const kind = mediaKind(node.attrs.src);
    if (!kind) return this.parent?.({ node, HTMLAttributes }) ?? ["img", HTMLAttributes];
    return [
      kind,
      { src: node.attrs.src, title: node.attrs.title, controls: "", preload: "metadata" },
    ];
  },
}).configure({ inline: true });

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

const label = {
  default: "",
  parseHTML: (element: HTMLElement) => element.getAttribute("data-label") ?? "",
  renderHTML: (attrs: Record<string, unknown>) => ({ "data-label": attrs.label }),
};

/** A footnote reference, `[^label]`. */
export const FootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ label }),
  parseHTML: () => [{ tag: "sup[data-footnote-reference]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "sup",
    { ...HTMLAttributes, "data-footnote-reference": "" },
    node.attrs.label,
  ],
});

/** A note written where it applies, `^[text]`. */
export const InlineFootnote = Node.create({
  name: "inlineFootnote",
  group: "inline",
  inline: true,
  content: "inline*",
  parseHTML: () => [{ tag: "span[data-inline-footnote]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "span",
    { ...HTMLAttributes, "data-inline-footnote": "" },
    0,
  ],
});

/** A footnote's text, `[^label]: text`, with the blocks indented under it. */
export const FootnoteDefinition = Node.create({
  name: "footnoteDefinition",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ label }),
  parseHTML: () => [{ tag: "div[data-footnote-definition]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    { ...HTMLAttributes, "data-footnote-definition": "" },
    0,
  ],
});

/** A definition list, `Term` then `: Definition`. */
export const DefinitionList = Node.create({
  name: "definitionList",
  group: "block",
  content: "(definitionTerm | definitionDescription)+",
  parseHTML: () => [{ tag: "dl" }],
  renderHTML: ({ HTMLAttributes }) => ["dl", HTMLAttributes, 0],
});

export const DefinitionTerm = Node.create({
  name: "definitionTerm",
  content: "inline*",
  defining: true,
  parseHTML: () => [{ tag: "dt" }],
  renderHTML: ({ HTMLAttributes }) => ["dt", HTMLAttributes, 0],
});

export const DefinitionDescription = Node.create({
  name: "definitionDescription",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: "dd" }],
  renderHTML: ({ HTMLAttributes }) => ["dd", HTMLAttributes, 0],
});

// The two halves of `{~~old~>new~~}` carry it, so they're written back as one substitution.
const substitution = {
  default: false,
  parseHTML: (element: HTMLElement) => element.hasAttribute("data-substitution"),
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs.substitution ? { "data-substitution": "" } : {},
};

/** CriticMarkup's suggested insertion, `{++text++}`. */
export const CriticInsertion = Mark.create({
  name: "criticInsertion",
  addAttributes: () => ({ substitution }),
  parseHTML: () => [{ tag: "ins" }],
  renderHTML: ({ HTMLAttributes }) => ["ins", HTMLAttributes, 0],
});

/** CriticMarkup's suggested deletion, `{--text--}`. */
export const CriticDeletion = Mark.create({
  name: "criticDeletion",
  addAttributes: () => ({ substitution }),
  parseHTML: () => [{ tag: "del[data-critic]" }],
  renderHTML: ({ HTMLAttributes }) => ["del", { ...HTMLAttributes, "data-critic": "" }, 0],
});

/** CriticMarkup's highlight, `{==text==}`. */
export const CriticHighlight = Mark.create({
  name: "criticHighlight",
  parseHTML: () => [{ tag: "mark" }],
  renderHTML: ({ HTMLAttributes }) => ["mark", HTMLAttributes, 0],
});

/** CriticMarkup's comment, `{>>text<<}`. */
export const CriticComment = Node.create({
  name: "criticComment",
  group: "inline",
  inline: true,
  content: "inline*",
  parseHTML: () => [{ tag: "span[data-critic-comment]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", { ...HTMLAttributes, "data-critic-comment": "" }, 0],
});

/**
 * The schema `fromMarkdown` and `toMarkdown` read and write: StarterKit's nodes and marks, task lists, inline images,
 * tables, footnotes, definition lists, CriticMarkup, and Comark's components, slots, and comments. It needs no DOM, so a server can load it to convert a document
 * for a collaborative room.
 */
export const ComarkKit = Extension.create<ComarkKitOptions>({
  name: "comarkKit",
  addOptions: () => ({ starterKit: {} }),
  addGlobalAttributes: () => [{ types: typesWithProps, attributes: { props } }],
  addExtensions() {
    return [
      StarterKit.extend({
        addExtensions() {
          return (this.parent?.() ?? []).map((extension) =>
            extension.name === "code" ? extension.extend({ excludes: "" }) : extension,
          );
        },
      }).configure({ ...this.options.starterKit, underline: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ComarkImage,
      TableKit.configure({ table: { resizable: false } }),
      ComarkBlock,
      ComarkSlot,
      ComarkInline,
      ComarkComment,
      FootnoteReference,
      InlineFootnote,
      FootnoteDefinition,
      DefinitionList,
      DefinitionTerm,
      DefinitionDescription,
      CriticInsertion,
      CriticDeletion,
      CriticHighlight,
      CriticComment,
    ];
  },
});
