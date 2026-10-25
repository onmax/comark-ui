import type { JSONContent } from "@tiptap/core";
import type { ComarkPlugin, ElementNode, ElementNodeAttributes, Node as AstNode } from "comark";
import { parseMarkdown } from "comark";
import { renderMarkdown } from "comark/render";
import { textContent } from "comark/utils";

type Props = ElementNodeAttributes;
type Mark = { type: string; attrs?: Record<string, unknown> };

// Paragraphs stay explicit, so an element among blocks is a block (`::badge`) and one in a paragraph is inline
// (`:badge`). Only the heading ids an author wrote are kept: an id derived from the text would go stale on an edit.
const parseOptions = { autoUnwrap: false, headingIds: false } as const;

const marks: Record<string, string> = {
  strong: "bold",
  em: "italic",
  del: "strike",
  code: "code",
  a: "link",
};
const markTags: Record<string, string> = {
  bold: "strong",
  italic: "em",
  strike: "del",
  code: "code",
  link: "a",
};
const inlineTags = new Set([...Object.keys(marks), "br", "img", "span", "input"]);
const headings = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
// Comark's writer prints these tags as Markdown, so a component that shares the name, such as `::table`, can't be
// written back as one.
const builtIn = new Set([...headings, "p", "blockquote", "hr", "pre", "table", "ul", "ol", "li"]);

const isElement = (node: AstNode): node is ElementNode =>
  Array.isArray(node) && typeof node[0] === "string";
const isComment = (node: AstNode) => Array.isArray(node) && node[0] === null;
// Raw HTML carries `$: { html, block }`; an inline tag such as `<kbd>` belongs in a paragraph.
const isInline = (node: AstNode) =>
  typeof node === "string" ||
  (isElement(node) &&
    (inlineTags.has(node[0]) || (node[1].$ as { block?: number } | undefined)?.block === 0));

/** The props a node has no field for, or `undefined` when none are left. */
function rest(props: Props, ...keys: string[]) {
  const left = Object.fromEntries(Object.entries(props).filter(([key]) => !keys.includes(key)));
  return Object.keys(left).length ? left : undefined;
}

const classes = (props: Props) => (typeof props.class === "string" ? props.class.split(/\s+/) : []);
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
): JSONContent => ({
  type,
  ...(Object.keys(attrs).length ? { attrs } : {}),
  ...(content?.length ? { content } : {}),
});

/** Set when the document holds something the schema can't keep, so writing it back would change it. */
interface Reading {
  lossy: boolean;
}

function readBlocks(children: AstNode[], reading: Reading): JSONContent[] {
  const out: JSONContent[] = [];
  let run: AstNode[] = [];
  const flush = () => {
    if (run.some((child) => typeof child !== "string" || child.trim()))
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
  if (!isElement(child)) {
    if (isComment(child)) return [node("comarkComment", { text: child[2] })];
    return [];
  }
  const [tag, props, ...children] = child;
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
    children.every((child) => isElement(child) && ["thead", "tbody", "tr"].includes(child[0]))
  )
    return [readTable(props, children, reading)];
  if (tag === "ul" || tag === "ol") return [readList(tag, props, children, reading)];
  // A slot only means something inside a component.
  if (tag === "template" || builtIn.has(tag)) reading.lossy = true;
  return [
    node("comarkBlock", withProps({ name: tag }, rest(props)), readComponent(children, reading)),
  ];
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
          withProps({ name: typeof name === "string" ? name : "default" }, rest(props)),
          readBlocks(child.slice(2) as AstNode[], reading),
        ),
      );
    } else run.push(child);
  }
  flush();
  return out;
}

function readCode(props: Props, children: AstNode[]): JSONContent {
  const code = children.find(isElement);
  const text = (code ? code.slice(2) : children)
    .filter((child) => typeof child === "string")
    .join("");
  const language = typeof props.language === "string" ? props.language : null;
  return node(
    "codeBlock",
    withProps(language ? { language } : {}, rest(props, "language")),
    text ? [{ type: "text", text }] : [],
  );
}

const isTaskItem = (child: AstNode) =>
  isElement(child) && child[0] === "li" && classes(child[1]).includes("task-list-item");
const isCheckbox = (child: AstNode | undefined) =>
  child !== undefined && isElement(child) && child[0] === "input" && child[1].type === "checkbox";

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
  const listItems = items.map(([, itemProps, ...content]) => {
    const blocks = readBlocks(content, reading);
    // A list item opens with a paragraph; an empty one writes nothing.
    if (blocks[0]?.type !== "paragraph") blocks.unshift({ type: "paragraph" });
    return node("listItem", withProps({}, rest(itemProps)), blocks);
  });
  if (tag === "ul") return node("bulletList", withProps({}, rest(props)), listItems);
  const start = Number(props.start ?? 1);
  return node(
    "orderedList",
    withProps(start === 1 ? {} : { start }, rest(props, "start")),
    listItems,
  );
}

function readTaskItem([, props, ...children]: ElementNode, reading: Reading): JSONContent {
  let checked = false;
  // The checkbox opens the item's first paragraph, or the item itself in a tight list.
  const strip = (content: AstNode[]) => {
    if (!isCheckbox(content[0])) return content;
    const [box, next, ...after] = content as [ElementNode, ...AstNode[]];
    checked = box[1][":checked"] === "true" || box[1].checked === true;
    return typeof next === "string"
      ? [next.replace(/^\s+/, ""), ...after]
      : next === undefined
        ? after
        : [next, ...after];
  };
  const [first, ...others] = children;
  const content =
    first !== undefined && isElement(first) && first[0] === "p"
      ? [[first[0], first[1], ...strip(first.slice(2) as AstNode[])] as ElementNode, ...others]
      : strip(children);
  const blocks = readBlocks(content, reading);
  if (blocks[0]?.type !== "paragraph") blocks.unshift({ type: "paragraph" });
  return node(
    "taskItem",
    withProps({ checked }, rest(withoutClass(props, "task-list-item"))),
    blocks,
  );
}

function readTable(props: Props, children: AstNode[], reading: Reading): JSONContent {
  const rows = children
    .filter(isElement)
    .flatMap((section) =>
      section[0] === "tr" ? [section] : (section.slice(2) as AstNode[]).filter(isElement),
    );
  return node(
    "table",
    withProps({}, rest(props)),
    rows.map(([, rowProps, ...cells]) =>
      node(
        "tableRow",
        withProps({}, rest(rowProps)),
        cells
          .filter(isElement)
          .map(([tag, cellProps, ...content]) =>
            node(tag === "th" ? "tableHeader" : "tableCell", withProps({}, rest(cellProps)), [
              node("paragraph", {}, readInline(content, [], reading)),
            ]),
          ),
      ),
    ),
  );
}

function readInline(children: AstNode[], active: Mark[], reading: Reading): JSONContent[] {
  const out: JSONContent[] = [];
  const marked = (json: JSONContent): JSONContent =>
    active.length ? { ...json, marks: active } : json;
  for (const child of children) {
    if (typeof child === "string") {
      // A soft break stays a line break: a callout's title is its first line.
      if (child) out.push(marked({ type: "text", text: child }));
      continue;
    }
    if (!isElement(child)) {
      // A comment inside a paragraph has no node to live in.
      reading.lossy = true;
      continue;
    }
    const [tag, props, ...content] = child;
    const mark = marks[tag];
    if (mark && !(tag === "code" && content.some((part) => typeof part !== "string"))) {
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

const propsOf = (json: JSONContent): Props => (json.attrs?.props as Props | null | undefined) ?? {};
const textOf = (content: JSONContent[] = []) => content.map((child) => child.text ?? "").join("");

function writeBlocks(content: JSONContent[] = []): AstNode[] {
  return content.flatMap(writeBlock);
}

function writeBlock(json: JSONContent): AstNode[] {
  const props = propsOf(json);
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
      const language =
        typeof attrs.language === "string" && attrs.language ? attrs.language : undefined;
      return [
        [
          "pre",
          language ? { ...props, language } : props,
          ["code", language ? { class: `language-${language}` } : {}, textOf(json.content)],
        ],
      ];
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
    case "taskItem": {
      // Written unwrapped, checkbox then text: Comark's writer drops the text of a task whose first paragraph is
      // wrapped and followed by a nested list.
      const [first, ...others] = json.content ?? [];
      const text = writeInline(first?.content);
      if (typeof text[0] === "string") text[0] = ` ${text[0]}`;
      else text.unshift(" ");
      const box: Props = {
        class: "task-list-item-checkbox",
        type: "checkbox",
        ":disabled": "true",
      };
      if (attrs.checked) box[":checked"] = "true";
      return [
        ["li", withClass(props, "task-list-item"), ["input", box], ...text, ...writeBlocks(others)],
      ];
    }
    case "table":
      return [writeTable(json, props)];
    case "comarkBlock":
      return [
        [
          String(attrs.name),
          props,
          ...(json.content ?? []).flatMap((child): AstNode[] =>
            child.type === "comarkSlot"
              ? [
                  [
                    "template",
                    { ...propsOf(child), name: child.attrs?.name },
                    ...writeBlocks(child.content),
                  ],
                ]
              : writeBlock(child),
          ),
        ],
      ];
    case "comarkComment":
      return [[null, {}, String(attrs.text ?? "")]];
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
      propsOf(json),
      ...(json.content ?? []).map((cell): ElementNode => [
        tag,
        propsOf(cell),
        // A Markdown cell holds one line.
        ...(cell.content ?? []).flatMap((paragraph, index): AstNode[] => [
          ...(index ? [["br", {}] as ElementNode] : []),
          ...writeInline(paragraph.content),
        ]),
      ]),
    ];
  const body = rows.slice(split).map(row("td"));
  return [
    "table",
    props,
    ["thead", {}, ...rows.slice(0, split).map(row("th"))],
    ...(body.length ? [["tbody", {}, ...body] as ElementNode] : []),
  ];
}

const sameMark = (a: Mark, b: Mark) =>
  a.type === b.type && JSON.stringify(a.attrs ?? {}) === JSON.stringify(b.attrs ?? {});

function writeMark(mark: Mark): ElementNode {
  const props = (mark.attrs?.props as Props | null | undefined) ?? {};
  if (mark.type !== "link") return [markTags[mark.type] ?? "span", props];
  const { href, title } = mark.attrs ?? {};
  return ["a", { ...props, href, ...(title ? { title } : {}) }];
}

function writeInline(content: JSONContent[] = []): AstNode[] {
  const root: AstNode[] = [];
  const open: Array<{ mark: Mark; element: ElementNode }> = [];
  // An element's children start after its tag and props.
  const push = (target: unknown[], child: AstNode) => {
    const last = target.length > (target === root ? 0 : 2) ? target.at(-1) : undefined;
    if (typeof child === "string" && typeof last === "string")
      target[target.length - 1] = last + child;
    else target.push(child);
  };
  for (const json of content) {
    const active = (json.marks ?? []) as Mark[];
    let keep = 0;
    while (keep < open.length && keep < active.length && sameMark(open[keep]!.mark, active[keep]!))
      keep++;
    open.length = keep;
    for (const mark of active.slice(keep)) {
      const element = writeMark(mark);
      push(open.at(-1)?.element ?? root, element);
      open.push({ mark, element });
    }
    const target = open.at(-1)?.element ?? root;
    for (const child of writeLeaf(json)) push(target, child);
  }
  return root;
}

function writeLeaf(json: JSONContent): AstNode[] {
  const props = propsOf(json);
  const attrs = json.attrs ?? {};
  if (json.type === "text") return json.text ? [json.text] : [];
  if (json.type === "hardBreak") return [["br", props]];
  if (json.type === "image") {
    const image: Props = { ...props, src: attrs.src };
    if (attrs.alt) image.alt = attrs.alt;
    if (attrs.title) image.title = attrs.title;
    return [["img", image]];
  }
  if (json.type === "comarkInline")
    return [[String(attrs.name), props, ...writeInline(json.content)]];
  return [];
}

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a).filter((key) => (a as Record<string, unknown>)[key] !== undefined);
  const other = Object.keys(b).filter((key) => (b as Record<string, unknown>)[key] !== undefined);
  return (
    keys.length === other.length &&
    keys.every((key) =>
      equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    )
  );
}

export interface EditorDocument {
  /** The document as Tiptap JSON, for `setContent` or a collaborative room. */
  doc: JSONContent;
  /** The front matter, which stays outside the editor: a collaborative room keeps only the body. */
  frontmatter: Record<string, unknown>;
  /** The Markdown holds something the editor can't keep, so writing it back would change more than the edit. */
  lossy: boolean;
}

/** Reads Markdown into the editor's document. */
export async function fromMarkdown(markdown: string): Promise<EditorDocument> {
  const tree = await parseMarkdown(markdown, parseOptions);
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
    { nodes: writeBlocks(doc.content), frontmatter: options.frontmatter ?? {}, meta: {} },
    { headingIds: false },
  );
  return markdown.trim() ? `${markdown.trimEnd()}\n` : "";
}

export type MarkdownCheck =
  | {
      editable: true;
      /** The Markdown as the editor writes it, which the first save produces. */ markdown: string;
    }
  | { editable: false };

/**
 * Whether the editor can open this Markdown and save it without changing what readers see. Pass the parse plugins the
 * page renders with, so syntax only they read, such as footnote definitions, counts too.
 */
export async function checkMarkdown(
  markdown: string,
  options: { plugins?: readonly ComarkPlugin<any, any>[] } = {},
): Promise<MarkdownCheck> {
  const first = await fromMarkdown(markdown);
  if (first.lossy) return { editable: false };
  const written = await toMarkdown(first.doc, first);
  const again = await fromMarkdown(written);
  if (again.lossy || !equal(first.doc, again.doc) || !equal(first.frontmatter, again.frontmatter))
    return { editable: false };
  // Only the text: plugins such as comark-tabs derive ids from a hash of the source, which any rewrite changes.
  if (options.plugins?.length) {
    const read = async (source: string) => {
      const tree = await parseMarkdown(source, { ...parseOptions, plugins: [...options.plugins!] });
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
