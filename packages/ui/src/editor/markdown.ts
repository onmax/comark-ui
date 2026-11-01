import type { JSONContent } from "@tiptap/core";
import type { ComarkPlugin, ElementNode, ElementNodeAttributes, Node as AstNode } from "comark";
import { parseMarkdown } from "comark";
import { parseFrontmatter } from "comark/parse";
import { renderFrontmatter, renderMarkdown } from "comark/render";
import { textContent } from "comark/utils";
import {
  between,
  blockComponent,
  definitionList,
  footnoteDefinition,
  footnoteReference,
  inlineComponent,
  own,
  substitution,
  task,
  trailingLines,
  writeOptions,
} from "./handlers.ts";
import { SHORTHAND, SUBSTITUTION, syntax } from "./syntax.ts";
import { scalar } from "../../../../shared/text.ts";

type Props = ElementNodeAttributes;
type Mark = { type: string; attrs?: Record<string, unknown> };

// Paragraphs stay explicit, so an element among blocks is a block (`::badge`) and one in a paragraph is inline
// (`:badge`). Only the heading ids an author wrote are kept: an id derived from the text would go stale on an edit.
const parseOptions = { autoUnwrap: false, headingIds: false } as const;
const readOptions = { ...parseOptions, plugins: syntax };

const marks = new Map([
  ["strong", "bold"],
  ["em", "italic"],
  ["del", "strike"],
  ["code", "code"],
  ["a", "link"],
]);
// comark-footnotes' markers, each followed by its label.
const DEFINITION = "cfn-def:";
const REFERENCE = "cfn-ref:";
const NOTE = "cfn-note";
const markTags = new Map([...marks].map(([tag, mark]) => [mark, tag]));
const inlineTags = new Set([
  ...marks.keys(),
  "br",
  "img",
  "span",
  "input",
  "ins",
  "mark",
  SUBSTITUTION,
  NOTE,
]);
const headings = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

// A text node is a string and every other node an array, so the array check tells them apart.
const isText = (node: AstNode): node is string => !Array.isArray(node);
const isElement = (node: AstNode): node is ElementNode => Array.isArray(node) && node[0] !== null;
// SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
const childrenOf = (element: ElementNode) => element.slice(2) as AstNode[];
// Raw HTML carries `$: { html, block }`; an inline tag such as `<kbd>` belongs in a paragraph.
const inlineHtml = ({ $: meta }: Props) =>
  meta instanceof Object && "block" in meta && meta.block === 0;
const isInline = (node: AstNode) =>
  isText(node) ||
  (isElement(node) &&
    (inlineTags.has(node[0]) || node[0].startsWith(REFERENCE) || inlineHtml(node[1])));
// Raw HTML is written by Comark's HTML handler, so only a component is the codec's to write.
const isHtml = (props: Props) => props.$ instanceof Object;

/** The props a node has no field for, or `undefined` when none are left. */
function rest(props: Props, ...keys: string[]) {
  const left = Object.fromEntries(Object.entries(props).filter(([key]) => !keys.includes(key)));
  return Object.keys(left).length ? left : undefined;
}

const classes = (props: Props) => scalar(props.class)?.split(/\s+/) ?? [];
function withoutClass(props: Props, name: string): Props {
  const left = classes(props).filter((value) => value && value !== name);
  const { class: _, ...others } = props;
  return left.length ? { ...others, class: left.join(" ") } : others;
}
function withClass(props: Props, name: string): Props {
  return {
    ...props,
    class: [name, ...classes(props).filter((value) => value && value !== name)].join(" "),
  };
}

const withProps = (attrs: Record<string, unknown>, props: Props | undefined) =>
  props ? { ...attrs, props } : attrs;
const node = (
  type: string,
  attrs: Record<string, unknown>,
  content?: JSONContent[],
): JSONContent => {
  const json: JSONContent = { type };
  if (Object.keys(attrs).length) json.attrs = attrs;
  if (content?.length) json.content = content;
  return json;
};

/** Set when the document holds something the schema can't keep, so writing it back would change it. */
interface Reading {
  lossy: boolean;
}

function readBlocks(children: AstNode[], reading: Reading): JSONContent[] {
  const out: JSONContent[] = [];
  let run: AstNode[] = [];
  const flush = () => {
    if (run.some((child) => !isText(child) || child.trim()))
      out.push(node("paragraph", {}, readInline(run, [], reading)));
    run = [];
  };
  for (const child of children) {
    if (isInline(child)) run.push(child);
    else {
      flush();
      out.push(...readBlock(child, reading));
    }
  }
  flush();
  return out;
}

function readBlock(child: AstNode, reading: Reading): JSONContent[] {
  if (isText(child)) return [];
  if (!isElement(child)) return [node("comarkComment", { text: child[2] })];
  const [tag, props] = child;
  const children = childrenOf(child);
  // `:name[text]{props}` alone on its line reads as a block, but it's an inline component in its own paragraph.
  if (SHORTHAND in props) {
    const { [SHORTHAND]: _, ...attrs } = props;
    return [node("paragraph", {}, readInline([[tag, attrs, ...children]], [], reading))];
  }
  if (tag === "p")
    return [node("paragraph", withProps({}, rest(props)), readInline(children, [], reading))];
  if (headings.has(tag))
    return [
      node(
        "heading",
        withProps({ level: Number(tag[1]) }, rest(props)),
        readInline(children, [], reading),
      ),
    ];
  if (tag === "blockquote")
    return [node("blockquote", withProps({}, rest(props)), readBlocks(children, reading))];
  if (tag === "hr") return [node("horizontalRule", withProps({}, rest(props)))];
  if (tag === "pre") return [readCode(props, children)];
  if (
    tag === "table" &&
    children.length &&
    children.every((part) => isElement(part) && ["thead", "tbody", "tr"].includes(part[0]))
  )
    return [readTable(props, children, reading)];
  if (tag === "ul" || tag === "ol") return [readList(tag, props, children, reading)];
  if (tag.startsWith(DEFINITION))
    return [
      node(
        "footnoteDefinition",
        { label: tag.slice(DEFINITION.length) },
        filled(readBlocks(children, reading)),
      ),
    ];
  if (tag === "dl") return [readDefinitions(props, children, reading)];
  // A slot only means something inside a component.
  if (tag === "template") reading.lossy = true;
  return [
    node("comarkBlock", withProps({ name: tag }, rest(props)), readComponent(children, reading)),
  ];
}

/** Blocks that need at least one, as an empty item or definition writes nothing. */
const filled = (blocks: JSONContent[]) =>
  blocks.length ? blocks : [{ type: "paragraph" } satisfies JSONContent];

function readDefinitions(props: Props, children: AstNode[], reading: Reading): JSONContent {
  return node(
    "definitionList",
    withProps({}, rest(props)),
    children.flatMap((item) => {
      if (!isElement(item)) return [];
      return item[0] === "dt"
        ? [
            node(
              "definitionTerm",
              withProps({}, rest(item[1])),
              readInline(childrenOf(item), [], reading),
            ),
          ]
        : [
            node(
              "definitionDescription",
              withProps({}, rest(item[1])),
              filled(readBlocks(childrenOf(item), reading)),
            ),
          ];
    }),
  );
}

function readComponent(children: AstNode[], reading: Reading): JSONContent[] {
  const out: JSONContent[] = [];
  let run: AstNode[] = [];
  const flush = () => {
    out.push(...readBlocks(run, reading));
    run = [];
  };
  for (const child of children) {
    if (isElement(child) && child[0] === "template") {
      flush();
      const { name, ...props } = child[1];
      out.push(
        node(
          "comarkSlot",
          withProps({ name: scalar(name) ?? "default" }, rest(props)),
          readBlocks(childrenOf(child), reading),
        ),
      );
    } else run.push(child);
  }
  flush();
  return out;
}

function readCode(props: Props, children: AstNode[]): JSONContent {
  const code = children.find(isElement);
  const text = (code ? childrenOf(code) : children).filter(isText).join("");
  const language = scalar(props.language) ?? null;
  return node(
    "codeBlock",
    withProps(language ? { language } : {}, rest(props, "language")),
    text ? [{ type: "text", text }] : [],
  );
}

const isTaskItem = (child: AstNode) =>
  isElement(child) && child[0] === "li" && classes(child[1]).includes("task-list-item");
const isCheckbox = (child: AstNode): child is ElementNode =>
  isElement(child) && child[0] === "input" && child[1].type === "checkbox";

function readList(
  tag: "ul" | "ol",
  props: Props,
  children: AstNode[],
  reading: Reading,
): JSONContent {
  const items = children.filter(isElement);
  if (tag === "ul" && items.length && items.every(isTaskItem))
    return node(
      "taskList",
      withProps({}, rest(withoutClass(props, "contains-task-list"))),
      items.map((item) => readTaskItem(item, reading)),
    );
  const listItems = items.map((item) => {
    const blocks = readBlocks(childrenOf(item), reading);
    // A list item opens with a paragraph; an empty one writes nothing.
    if (blocks[0]?.type !== "paragraph") blocks.unshift({ type: "paragraph" });
    return node("listItem", withProps({}, rest(item[1])), blocks);
  });
  if (tag === "ul") return node("bulletList", withProps({}, rest(props)), listItems);
  const start = Number(props.start ?? 1);
  return node(
    "orderedList",
    withProps(start === 1 ? {} : { start }, rest(props, "start")),
    listItems,
  );
}

function readTaskItem(item: ElementNode, reading: Reading): JSONContent {
  let checked = false;
  // The checkbox opens the item's first paragraph, or the item itself in a tight list.
  const strip = (content: AstNode[]): AstNode[] => {
    const [box, next, ...after] = content;
    if (box === undefined || !isCheckbox(box)) return content;
    checked = box[1][":checked"] === "true" || box[1].checked === true;
    if (next === undefined) return after;
    return isText(next) ? [next.replace(/^\s+/, ""), ...after] : [next, ...after];
  };
  const [first, ...others] = childrenOf(item);
  let content: AstNode[];
  if (first !== undefined && isElement(first) && first[0] === "p") {
    const paragraph: ElementNode = [first[0], first[1], ...strip(childrenOf(first))];
    content = [paragraph, ...others];
  } else content = strip(childrenOf(item));
  const blocks = readBlocks(content, reading);
  if (blocks[0]?.type !== "paragraph") blocks.unshift({ type: "paragraph" });
  return node(
    "taskItem",
    withProps({ checked }, rest(withoutClass(item[1], "task-list-item"))),
    blocks,
  );
}

function readTable(props: Props, children: AstNode[], reading: Reading): JSONContent {
  const rows = children
    .filter(isElement)
    .flatMap((section) =>
      section[0] === "tr" ? [section] : childrenOf(section).filter(isElement),
    );
  return node(
    "table",
    withProps({}, rest(props)),
    rows.map((row) =>
      node(
        "tableRow",
        withProps({}, rest(row[1])),
        childrenOf(row)
          .filter(isElement)
          .map((cell) =>
            node(cell[0] === "th" ? "tableHeader" : "tableCell", withProps({}, rest(cell[1])), [
              node("paragraph", {}, readInline(childrenOf(cell), [], reading)),
            ]),
          ),
      ),
    ),
  );
}

// comark-critic's classes: a `del` without one is `~~strikethrough~~`.
const critics = new Map([
  ["ins", { className: "ccm-ins", type: "criticInsertion" }],
  ["del", { className: "ccm-del", type: "criticDeletion" }],
  ["mark", { className: "ccm-mark", type: "criticHighlight" }],
]);
const COMMENT = "ccm-comment";

function criticMark([tag, props]: ElementNode) {
  const critic = critics.get(tag);
  if (!critic || !classes(props).includes(critic.className)) return;
  return { className: critic.className, mark: { type: critic.type } satisfies Mark };
}

function readInline(children: AstNode[], active: Mark[], reading: Reading): JSONContent[] {
  const out: JSONContent[] = [];
  const marked = (json: JSONContent): JSONContent =>
    active.length ? { ...json, marks: active } : json;
  for (const child of children) {
    if (isText(child)) {
      // A soft break stays a line break: a callout's title is its first line.
      if (child) out.push(marked({ type: "text", text: child }));
      continue;
    }
    if (!isElement(child)) {
      // A comment inside a paragraph has no node to live in.
      reading.lossy = true;
      continue;
    }
    const [tag, props] = child;
    const content = childrenOf(child);
    const critic = criticMark(child);
    const mark = marks.get(tag);
    if (critic) {
      if (rest(withoutClass(props, critic.className))) reading.lossy = true;
      out.push(...readInline(content, [...active, critic.mark], reading));
    } else if (tag === SUBSTITUTION) {
      const [removed, added] = content.filter(isElement);
      const half = (element: ElementNode | undefined, type: string): JSONContent[] =>
        element
          ? readInline(
              childrenOf(element),
              [...active, { type, attrs: { substitution: true } }],
              reading,
            )
          : [];
      out.push(...half(removed, "criticDeletion"), ...half(added, "criticInsertion"));
    } else if (tag === "span" && classes(props).includes(COMMENT)) {
      if (rest(withoutClass(props, COMMENT))) reading.lossy = true;
      out.push(marked(node("criticComment", {}, readInline(content, [], reading))));
    } else if (tag.startsWith(REFERENCE))
      out.push(marked(node("footnoteReference", { label: tag.slice(REFERENCE.length) })));
    else if (tag === NOTE)
      out.push(marked(node("inlineFootnote", {}, readInline(content, [], reading))));
    else if (mark && !(tag === "code" && !content.every(isText))) {
      const attrs =
        mark === "link"
          ? withProps(
              { href: props.href ?? null, title: props.title ?? null },
              rest(props, "href", "title"),
            )
          : withProps({}, rest(props));
      const next: Mark = Object.keys(attrs).length ? { type: mark, attrs } : { type: mark };
      out.push(...readInline(content, [...active, next], reading));
    } else if (tag === "br") out.push(marked(node("hardBreak", withProps({}, rest(props)))));
    else if (tag === "img")
      out.push(
        marked(
          node(
            "image",
            withProps(
              { src: props.src ?? null, alt: props.alt ?? null, title: props.title ?? null },
              rest(props, "src", "alt", "title"),
            ),
          ),
        ),
      );
    else
      out.push(
        marked(
          node(
            "comarkInline",
            withProps({ name: tag }, rest(props)),
            readInline(content, [], reading),
          ),
        ),
      );
  }
  return out;
}

// Tiptap types attributes as `any`; the codec wrote `props` as a plain object or left it out.
const propsOf = (attrs: JSONContent["attrs"]): Props => attrs?.props ?? {};
const plainText = (content: JSONContent[] = []) =>
  content.map((child) => child.text ?? "").join("");

function writeBlocks(content: JSONContent[] = []): AstNode[] {
  return content.flatMap(writeBlock);
}

function writeBlock(json: JSONContent): AstNode[] {
  const props = propsOf(json.attrs);
  const attrs = json.attrs ?? {};
  switch (json.type) {
    case "paragraph":
      // Markdown has no empty paragraph.
      return json.content?.length ? [["p", props, ...writeInline(json.content)]] : [];
    case "heading":
      return [[`h${Number(attrs.level ?? 1)}`, props, ...writeInline(json.content)]];
    case "blockquote":
      return [["blockquote", props, ...writeBlocks(json.content)]];
    case "horizontalRule":
      return [["hr", props]];
    case "codeBlock": {
      const language = scalar(attrs.language) || undefined;
      const code = plainText(json.content);
      const pre: ElementNode = [
        "pre",
        language ? { ...props, language } : props,
        ["code", language ? { class: `language-${language}` } : {}, code],
      ];
      return [code.trimEnd() === code ? pre : own(pre, trailingLines)];
    }
    case "bulletList":
      return [["ul", props, ...writeBlocks(json.content)]];
    case "orderedList": {
      const start = Number(attrs.start ?? 1);
      return [["ol", start === 1 ? props : { ...props, start }, ...writeBlocks(json.content)]];
    }
    case "listItem":
      return [["li", props, ...writeBlocks(json.content)]];
    case "taskList":
      return [["ul", withClass(props, "contains-task-list"), ...writeBlocks(json.content)]];
    case "taskItem":
      return [own(["li", props, ...writeBlocks(json.content)], task(Boolean(attrs.checked)))];
    case "table":
      return [writeTable(json, props)];
    case "comarkBlock": {
      const component: ElementNode = [
        String(attrs.name),
        props,
        ...(json.content ?? []).flatMap((child): AstNode[] =>
          child.type === "comarkSlot"
            ? [
                [
                  "template",
                  { ...propsOf(child.attrs), name: child.attrs?.name },
                  ...writeBlocks(child.content),
                ],
              ]
            : writeBlock(child),
        ),
      ];
      return [isHtml(props) ? component : own(component, blockComponent)];
    }
    case "footnoteDefinition": {
      const label = scalar(attrs.label) ?? "";
      return [own(["footnote", {}, ...writeBlocks(json.content)], footnoteDefinition(label))];
    }
    case "definitionList":
      return [
        own(
          [
            "dl",
            props,
            ...(json.content ?? []).map((item): ElementNode =>
              item.type === "definitionTerm"
                ? ["dt", propsOf(item.attrs), ...writeInline(item.content)]
                : ["dd", propsOf(item.attrs), ...writeBlocks(item.content)],
            ),
          ],
          definitionList,
        ),
      ];
    case "comarkComment":
      return [[null, {}, scalar(attrs.text) ?? ""]];
    default:
      return [];
  }
}

function writeTable(json: JSONContent, props: Props): ElementNode {
  const rows = json.content ?? [];
  const isHeader = (row: JSONContent) =>
    row.content?.every((cell) => cell.type === "tableHeader") ?? false;
  // A Markdown table always has a header row.
  const firstBody = rows.findIndex((row) => !isHeader(row));
  const split = firstBody === -1 ? rows.length : Math.max(1, firstBody);
  const row =
    (tag: "th" | "td") =>
    (json: JSONContent): ElementNode => [
      "tr",
      propsOf(json.attrs),
      ...(json.content ?? []).map((cell): ElementNode => [
        tag,
        propsOf(cell.attrs),
        // A Markdown cell holds one line.
        ...(cell.content ?? []).flatMap((paragraph, index): AstNode[] => [
          ...(index ? [["br", {}] satisfies ElementNode] : []),
          ...writeInline(paragraph.content),
        ]),
      ]),
    ];
  const body = rows.slice(split).map(row("td"));
  const thead: ElementNode = ["thead", {}, ...rows.slice(0, split).map(row("th"))];
  return [
    "table",
    props,
    thead,
    ...(body.length ? [["tbody", {}, ...body] satisfies ElementNode] : []),
  ];
}

const sameMark = (a: Mark, b: Mark) =>
  a.type === b.type && JSON.stringify(a.attrs ?? {}) === JSON.stringify(b.attrs ?? {});

const criticDelimiters = new Map<string, [open: string, close: string]>([
  ["criticInsertion", ["{++", "++}"]],
  ["criticDeletion", ["{--", "--}"]],
  ["criticHighlight", ["{==", "==}"]],
]);

function writeMark(mark: Mark, children: AstNode[]): ElementNode {
  const delimiters = criticDelimiters.get(mark.type);
  if (delimiters) {
    // Tagged for `pairSubstitutions`, which writes the two halves of a substitution as one.
    const half = mark.attrs?.substitution ? mark.type : "critic";
    return own([half, {}, ...children], between(...delimiters));
  }
  const props = propsOf(mark.attrs);
  if (mark.type !== "link") return [markTags.get(mark.type) ?? "span", props, ...children];
  const href = scalar(mark.attrs?.href);
  const title = scalar(mark.attrs?.title);
  const link: Props = { ...props, href };
  if (title) link.title = title;
  return ["a", link, ...children];
}

// Adjacent text joins into one node, as Comark's parser would have read it.
function append(children: AstNode[], child: AstNode) {
  const last = children.at(-1);
  if (last !== undefined && isText(last) && isText(child))
    children[children.length - 1] = last + child;
  else children.push(child);
}

function writeInline(content: JSONContent[] = []): AstNode[] {
  // The marks open around the current text, outermost first, each with the children written inside it so far.
  const open: Array<{ mark: Mark; children: AstNode[] }> = [];
  const root: AstNode[] = [];
  const close = (depth: number) => {
    for (let frame = open.pop(); frame; frame = open.length > depth ? open.pop() : undefined)
      append(open.at(-1)?.children ?? root, writeMark(frame.mark, frame.children));
  };
  for (const json of content) {
    // ProseMirror orders marks by schema rank. Code must wrap only text in Markdown, so formatting goes outside it
    // even when the schema ranks code before italic, and a suggested change wraps the formatting it changes.
    const active: Mark[] = [...(json.marks ?? [])].sort(
      (left, right) => markOrder(left) - markOrder(right),
    );
    const same = (index: number) => {
      const frame = open[index];
      const mark = active[index];
      return frame !== undefined && mark !== undefined && sameMark(frame.mark, mark);
    };
    let keep = 0;
    while (same(keep)) keep++;
    if (open.length > keep) close(keep);
    for (const mark of active.slice(keep)) open.push({ mark, children: [] });
    for (const child of writeLeaf(json)) append(open.at(-1)?.children ?? root, child);
  }
  if (open.length) close(0);
  return pairSubstitutions(root);
}

const markOrder = (mark: Mark) =>
  criticDelimiters.has(mark.type) ? -1 : mark.type === "code" ? 1 : 0;

/** Joins a deletion and the insertion right after it, both from one `{~~old~>new~~}`, back into one. */
function pairSubstitutions(children: AstNode[]): AstNode[] {
  const out: AstNode[] = [];
  for (const child of children) {
    const last = out.at(-1);
    if (
      isElement(child) &&
      child[0] === "criticInsertion" &&
      last !== undefined &&
      isElement(last) &&
      last[0] === "criticDeletion"
    )
      out[out.length - 1] = own([SUBSTITUTION, {}, last, child], substitution);
    else out.push(child);
  }
  return out;
}

function writeLeaf(json: JSONContent): AstNode[] {
  const props = propsOf(json.attrs);
  const attrs = json.attrs ?? {};
  if (json.type === "text") return json.text ? [json.text] : [];
  if (json.type === "hardBreak") return [["br", props]];
  if (json.type === "image") {
    const image: Props = { ...props, src: attrs.src };
    if (attrs.alt) image.alt = attrs.alt;
    if (attrs.title) image.title = attrs.title;
    return [["img", image]];
  }
  if (json.type === "comarkInline") {
    const component: ElementNode = [String(attrs.name), props, ...writeInline(json.content)];
    return [isHtml(props) ? component : own(component, inlineComponent)];
  }
  if (json.type === "footnoteReference")
    return [own(["footnote", {}], footnoteReference(scalar(attrs.label) ?? ""))];
  if (json.type === "inlineFootnote")
    return [own(["footnote", {}, ...writeInline(json.content)], between("^[", "]"))];
  if (json.type === "criticComment")
    return [own(["span", {}, ...writeInline(json.content)], between("{>>", "<<}"))];
  return [];
}

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!(a instanceof Object) || !(b instanceof Object) || Array.isArray(a) !== Array.isArray(b))
    return false;
  const left = Object.entries(a).filter(([, value]) => value !== undefined);
  const right = new Map(Object.entries(b).filter(([, value]) => value !== undefined));
  return (
    left.length === right.size &&
    left.every(([key, value]) => right.has(key) && equal(value, right.get(key)))
  );
}

export interface EditorDocument {
  /** The document as Tiptap JSON, for `setContent` or a collaborative room. */
  doc: JSONContent;
  /** The front matter, which stays outside the editor. A collaborative room keeps it beside the body, in its fields. */
  frontmatter: Record<string, unknown>;
  /** The Markdown holds something the editor can't keep, so writing it back would change more than the edit. */
  lossy: boolean;
}

/** Reads Markdown into the editor's document. */
export async function fromMarkdown(markdown: string): Promise<EditorDocument> {
  const tree = await parseMarkdown(markdown, readOptions);
  const reading: Reading = { lossy: false };
  const content = readBlocks(tree.nodes, reading);
  return {
    doc: { type: "doc", content: content.length ? content : [{ type: "paragraph" }] },
    frontmatter: tree.frontmatter ?? {},
    lossy: reading.lossy,
  };
}

/** Writes the editor's document, such as `editor.getJSON()`, back to Markdown. */
export async function toMarkdown(
  doc: JSONContent,
  options: { frontmatter?: Record<string, unknown> } = {},
): Promise<string> {
  const markdown = await renderMarkdown(
    { nodes: writeBlocks(doc.content), frontmatter: {}, meta: {} },
    writeOptions,
  );
  return withFrontmatter(markdown.trim() ? `${markdown.trimEnd()}\n` : "", options.frontmatter);
}

/** A Markdown file as a collaborative room holds it: the body the editor shows, and the frontmatter beside it. */
export interface SplitMarkdown {
  body: string;
  fields: Record<string, unknown>;
}

type Frontmatter =
  | { kind: "none" }
  | ({ kind: "kept" } & SplitMarkdown)
  | {
      kind: "lost";
      problem: string;
      /** The text below a block Comark can't parse. */ body?: string;
    };

/** Finds the frontmatter block where Comark does, and says why a save wouldn't write it back. */
export function readFrontmatter(markdown: string): Frontmatter {
  if (!markdown.startsWith("---") || !markdown.includes("\n---")) return { kind: "none" };
  let read: ReturnType<typeof parseFrontmatter>;
  try {
    read = parseFrontmatter(markdown);
  } catch (error) {
    const reason = String(error instanceof Error && "reason" in error ? error.reason : error);
    return {
      kind: "lost",
      problem: `The frontmatter isn't valid YAML (${reason}); fix it to edit the document.`,
      body: markdown.slice(markdown.indexOf("\n---") + 4).replace(/^(?:\r?\n)+/, ""),
    };
  }
  const { data, frontmatterText: yaml } = read;
  // Comark types the parsed YAML as a mapping, but plain text parses to a string and a list to an array.
  const value: unknown = data;
  if (!(value instanceof Object) || Array.isArray(value))
    return {
      kind: "lost",
      problem: `The frontmatter is a YAML ${Array.isArray(value) ? "list" : "scalar"}, which a save would rewrite; turn it into \`key: value\` lines to edit the document.`,
    };
  const comments = hasComment(yaml);
  if (!Object.keys(data).length)
    return {
      kind: "lost",
      problem: comments
        ? "The frontmatter holds only YAML comments, which a save would drop; delete them or move them into the text to edit the document."
        : "The frontmatter block is empty, so a save wouldn't write it back; delete its `---` lines or add a `key: value` line to edit the document.",
    };
  if (comments)
    return {
      kind: "lost",
      problem:
        "The frontmatter has YAML comments, which a save would drop; delete them or move them into the text to edit the document.",
    };
  // Y.Map.toJSON() and Yjs update decoding assign to plain objects, whose __proto__ setter drops this key.
  if (hasProtoKey(data))
    return {
      kind: "lost",
      problem:
        "The frontmatter has a `__proto__` key, which the room's fields would drop on save; rename it to edit the document.",
    };
  return { kind: "kept", body: read.content.replace(/^(?:\r?\n)+/, ""), fields: data };
}

function hasProtoKey(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  return (
    Object.hasOwn(value, "__proto__") ||
    Object.values(value).some((child) => hasProtoKey(child, seen))
  );
}

/**
 * Whether the YAML has a comment. A `#` after a space may sit inside a quoted value, so each candidate counts only when
 * cutting the line there leaves the same data.
 */
function hasComment(yaml: string): boolean {
  const lines = yaml.split("\n");
  const data = (text: string) => {
    try {
      return { value: parseFrontmatter(`---\n${text}\n---\n`).data };
    } catch {
      return undefined;
    }
  };
  const original = data(yaml);
  return lines.some((line, index) =>
    [...line.matchAll(/(?:^|\s)#/g)].some((match) => {
      const cut = [...lines];
      cut[index] = line.slice(0, match.index);
      const read = data(cut.join("\n"));
      return read !== undefined && equal(read.value, original?.value);
    }),
  );
}

/** Writes the frontmatter above the body. Comark's own writer leaves out the `---` lines when the body is empty. */
export function withFrontmatter(body: string, frontmatter: Record<string, unknown> = {}): string {
  if (!Object.keys(frontmatter).length) return body;
  return `---\n${renderFrontmatter(frontmatter, "")}\n---\n${body ? `\n${body}` : ""}`;
}

export type MarkdownCheck =
  | {
      editable: true;
      /** The Markdown as the editor writes it, which the first save produces. */ markdown: string;
    }
  | {
      editable: false;
      /** Why, when it's the frontmatter the editor can't keep. */ reason?: string;
    };

/**
 * Whether the editor can open this Markdown and save it without changing what readers see. Pass the parse plugins the
 * page renders with, so syntax only they read, such as footnote definitions, counts too.
 */
export async function checkMarkdown(
  markdown: string,
  options: { plugins?: readonly ComarkPlugin<any, any>[] } = {},
): Promise<MarkdownCheck> {
  const frontmatter = readFrontmatter(markdown);
  if (frontmatter.kind === "lost") return { editable: false, reason: frontmatter.problem };
  const first = await fromMarkdown(markdown);
  if (first.lossy) return { editable: false };
  const written = await toMarkdown(first.doc, first);
  const again = await fromMarkdown(written);
  if (again.lossy || !equal(first.doc, again.doc) || !equal(first.frontmatter, again.frontmatter))
    return { editable: false };
  // Only the text: plugins such as comark-tabs derive ids from a hash of the source, which any rewrite changes.
  const { plugins = [] } = options;
  if (plugins.length) {
    const read = async (source: string) => {
      const tree = await parseMarkdown(source, { ...parseOptions, plugins: [...plugins] });
      return tree.nodes
        .map((child) => textContent(child))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    };
    if ((await read(markdown)) !== (await read(written))) return { editable: false };
  }
  return { editable: true, markdown: written };
}
