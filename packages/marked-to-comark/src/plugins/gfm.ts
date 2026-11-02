import type {
  ComarkParseTokensState,
  ComarkPlugin,
  ElementNode,
  MarkdownExitPlugin,
  Node,
} from "comark";
import { decodeHTML } from "entities";

type Token = ComarkParseTokensState["tokens"][number];
type MarkdownExit = Parameters<MarkdownExitPlugin>[0];
type TokenClass = new (type: string, tag: string, nesting: Token["nesting"]) => Token;

// SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
const tokenClass = (token: Token) => token.constructor as TokenClass;

/**
 * markdown-exit marks the paragraphs of a tight list hidden, and Comark keeps them. Dropping them gives remark's
 * `<li>text</li>`. Components hide their lone paragraph the same way, and remark-mdc keeps that one, so only list
 * items lose theirs.
 */
/** Plain CommonMark: markdown-exit's GFM tables and strikethrough off, for chains that never used remark-gfm. */
export const commonmark = (): ComarkPlugin => ({
  name: "marked-to-comark:commonmark",
  markdownItPlugins: [(md: MarkdownExit) => md.disable(["table", "strikethrough"])],
});

export const tightLists = (): ComarkPlugin => ({
  name: "marked-to-comark:tight-lists",
  markdownItPost(state) {
    const open: string[] = [];
    state.tokens = state.tokens.filter((token) => {
      if (token.type === "paragraph_open" || token.type === "paragraph_close")
        return !(token.hidden && open.at(-1) === "list_item_open");
      if (token.nesting === 1) open.push(token.type);
      else if (token.nesting === -1) open.pop();
      return true;
    });
  },
});

// GFM links bare `www.` hosts, URLs with a scheme, and emails; markdown-exit also links `example.com`.
const GFM_LITERAL = /^(?:https?:\/\/|www\.|mailto:|xmpp:)|^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/i;

// GFM leaves trailing punctuation, an unbalanced `)`, and a trailing entity reference out of a literal autolink.
function gfmTrim(url: string): string {
  let end = url.length;
  for (;;) {
    const rest = url.slice(0, end);
    if (/[?!.,:*_~]$/.test(rest)) end--;
    else if (
      rest.endsWith(")") &&
      (rest.match(/\(/g)?.length ?? 0) < (rest.match(/\)/g)?.length ?? 0)
    )
      end--;
    else if (/&[a-z\d]+;$/i.test(rest)) end = rest.search(/&[a-z\d]+;$/i);
    else return rest;
  }
}

/**
 * Autolinks only what GitHub links: drops markdown-exit's fuzzy links to bare domains like `gsap.com`, and trims
 * the punctuation GFM leaves outside a link.
 */
export const gfmLinks = (): ComarkPlugin => ({
  name: "marked-to-comark:gfm-links",
  markdownItPost(state) {
    for (const block of state.tokens) {
      if (block.type !== "inline" || !block.children) continue;
      const children = block.children;
      // One forward pass into a new list: searching and splicing per link is quadratic on link-heavy documents.
      const out: Token[] = [];
      for (let index = 0; index < children.length; index++) {
        const open = children[index]!;
        if (open.type !== "link_open" || open.markup !== "linkify") {
          out.push(open);
          continue;
        }
        let close = index + 1;
        while (close < children.length && children[close]!.type !== "link_close") close++;
        const text = children[index + 1];
        if (text?.type !== "text" || !GFM_LITERAL.test(text.content)) {
          for (let at = index + 1; at < close; at++) out.push(children[at]!);
          index = close;
          continue;
        }
        for (let at = index; at <= close && at < children.length; at++) out.push(children[at]!);
        index = close;
        const kept = gfmTrim(text.content);
        if (kept === text.content) continue;
        const rest = text.content.slice(kept.length);
        text.content = kept;
        const href = open.attrs?.find(([name]) => name === "href");
        if (href?.[1].endsWith(rest)) href[1] = href[1].slice(0, -rest.length);
        const after = new (tokenClass(text))("text", "", 0);
        after.content = rest;
        out.push(after);
      }
      block.children = out;
    }
  },
});

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...children]: ElementNode): Node[] => children;
// SAFETY: an element is its tag and attributes followed by its children, so from index 2 on it holds only nodes.
const asList = (node: ElementNode): Node[] => node as Node[];
const isString = (value: unknown): value is string => value === String(value);

const INLINE_TAGS = new Set(
  "a abbr b bdi bdo br cite code data dfn em i img input kbd label mark q s samp small span strong sub sup time u var wbr del ins picture source svg video audio".split(
    " ",
  ),
);

// Through the end of the block when the closing tag is missing, as a browser reads it.
const RAW_TAGS = /<(pre|script|style|textarea)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;
// html() turns each HTML block into an inline token that shares the block's `map` array, which is how
// htmlEntities() finds them.
const htmlBlockMaps = new WeakSet<object>();
/** Whether an inline token was built from an HTML block, whose text marked never reads as Markdown. */
export const fromHtmlBlock = (token: Token) => Boolean(token.map && htmlBlockMaps.has(token.map));
const tagAt = (text: string) => /^<\/?([A-Za-z][\w-]*)/.exec(text)?.[1]?.toLowerCase();
const inlineName = (name: string | undefined) =>
  name === "#text" || (name !== undefined && INLINE_TAGS.has(name));

function joinLines(html: string): string {
  if (!html.includes("\n")) return html;
  const kept: string[] = [];
  const content = html.replace(RAW_TAGS, (raw) => `\u0000${kept.push(raw) - 1}\u0000`);
  const joined = content.replace(/[ \t]*\n[ \t]*(?=\S)/g, (gap, offset: number) => {
    const before = content[offset - 1];
    if (before === undefined || before === "\n") return gap;
    const left =
      before === ">" ? tagAt(content.slice(content.lastIndexOf("<", offset - 1))) : "#text";
    const right =
      content[offset + gap.length] === "<" ? tagAt(content.slice(offset + gap.length)) : "#text";
    return inlineName(left) && inlineName(right) ? " " : gap;
  });
  // eslint-disable-next-line no-control-regex -- NUL marks a kept raw-tag run; Markdown can't contain one.
  return joined.replace(/\u0000(\d+)\u0000/g, (_, index: string) => kept[Number(index)]!);
}

function inlineSide(token: Token | undefined): boolean {
  if (!token) return false;
  if (token.type !== "html_inline") return token.type !== "softbreak" && token.type !== "hardbreak";
  const name = /^<\/?([A-Za-z][\w-]*)/.exec(token.content)?.[1]?.toLowerCase();
  return name !== undefined && INLINE_TAGS.has(name);
}

/**
 * Inside HTML, Comark drops a line break between text and tags, so `A •\n<a>B</a>` loses the space a browser shows.
 * HTML blocks hold it in their source and Markdown inside HTML holds it as a soft break; both get a plain space.
 * Turning those breaks into a space keeps it; breaks next to block tags carry no space and stay.
 */
const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
// Tags that end a paragraph in the HTML parser, so one opened inside a paragraph can rightly stay open after it.
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "dialog",
  "div",
  "dl",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "main",
  "menu",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "ul",
  "center",
]);

/**
 * An inline tag left open in a paragraph or heading (`GET /apps/<id>`) closes where it ends, as the HTML parser closes
 * it; Comark keeps it open across blocks, swallowing the `<p>` and nesting what follows inside it.
 */
export const closeInlineHtml = (): ComarkPlugin => ({
  name: "marked-to-comark:close-inline-html",
  markdownItPost(state) {
    const tokens = state.tokens;
    for (let index = 1; index < tokens.length; index++) {
      const inline = tokens[index]!;
      const opener = tokens[index - 1]!.type;
      // A paragraph the html plugin built from an HTML block is HTML: a tag it opens may close in a later block.
      if (
        (opener !== "paragraph_open" && opener !== "heading_open") ||
        inline.type !== "inline" ||
        !inline.children ||
        (inline.map && htmlBlockMaps.has(inline.map))
      )
        continue;
      const open: string[] = [];
      for (const child of inline.children) {
        if (child.type !== "html_inline") continue;
        const tag = /^<(\/?)([A-Za-z][\w-]*)[^>]*?(\/?)>$/.exec(child.content.trim());
        if (!tag) continue;
        const name = tag[2]!.toLowerCase();
        if (VOID.has(name) || BLOCK_TAGS.has(name) || tag[3]) continue;
        if (!tag[1]) open.push(name);
        else if (open.lastIndexOf(name) !== -1) open.splice(open.lastIndexOf(name));
      }
      if (!open.length) continue;
      const make = tokenClass(inline.children[0]!);
      for (const name of open.reverse()) {
        const close = new make("html_inline", "", 0);
        close.content = `</${name}>`;
        inline.children.push(close);
      }
    }
  },
});

/** Markdown images keep an empty `alt`, which marks them decorative; Comark drops the attribute when it's empty. */
export const imageAlt = (): ComarkPlugin => ({
  name: "marked-to-comark:image-alt",
  post(state) {
    const visit = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!isElement(node)) continue;
        if (node[0] === "img" && !node[1].$?.html && node[1].alt === undefined) node[1].alt = "";
        visit(asList(node), 2);
      }
    };
    visit(state.tree.nodes, 0);
  },
});

export const htmlWhitespace = (): ComarkPlugin => ({
  name: "marked-to-comark:html-whitespace",
  markdownItPost(state) {
    for (const block of state.tokens) {
      if (block.type === "html_block") {
        block.content = joinLines(block.content);
        if (block.map) htmlBlockMaps.add(block.map);
      }
      const children = block.children;
      if (block.type !== "inline" || !children) continue;
      // Comark drops a softbreak while an HTML tag is open, even between two lines of text; as text it survives.
      for (let index = 0; index < children.length; index++) {
        const token = children[index]!;
        if (token.type !== "softbreak") continue;
        const space = new (tokenClass(token))("text", "", 0);
        space.content =
          inlineSide(children[index - 1]) && inlineSide(children[index + 1]) ? " " : "\n";
        children[index] = space;
      }
    }
  },
});

const MARK = "data-marked-to-comark-p";
let parses = 0;

/**
 * Comark drops the `<p>` around a paragraph that holds only HTML (`<video …></video>`, linked badges), treating it
 * like an HTML block; CommonMark keeps it. Every opening tag of such a paragraph carries a mark through parsing, with
 * a value unique to this parse so an authored attribute of the same name can't pass for one, and each run of marked
 * siblings that lost its paragraph gets it back.
 */
export const htmlParagraphs = (): ComarkPlugin => ({
  name: "marked-to-comark:html-paragraphs",
  markdownItPost(state) {
    const tokens = state.tokens;
    const nonce = `p${++parses}`;
    state.paragraphMark = nonce;
    let paragraph = 0;
    for (let index = 1; index < tokens.length; index++) {
      const children = tokens[index]!.children;
      if (
        tokens[index - 1]!.type !== "paragraph_open" ||
        tokens[index - 1]!.hidden ||
        children?.[0]?.type !== "html_inline"
      )
        continue;
      paragraph++;
      for (const child of children) {
        if (child.type === "html_inline")
          child.content = child.content.replace(
            /^<([A-Za-z][\w-]*)/,
            `<$1 ${MARK}="${nonce}-${paragraph}"`,
          );
      }
    }
  },
  post(state) {
    const nonce: string | undefined = state.paragraphMark;
    if (!nonce) return;
    const markOf = (node: Node | undefined) => {
      const value = isElement(node) ? node[1][MARK] : undefined;
      return isString(value) && value.startsWith(`${nonce}-`) ? value : undefined;
    };
    const clear = (node: Node) => {
      if (!isElement(node)) return;
      if (markOf(node)) delete node[1][MARK];
      for (const child of childrenOf(node)) clear(child);
    };
    const restore = (nodes: Node[], start: number, inParagraph: boolean) => {
      // Where each paragraph's run ends, found once: the run reaches the last sibling with the same mark.
      const last = new Map<string, number>();
      if (!inParagraph)
        for (let index = start; index < nodes.length; index++) {
          const mark = markOf(nodes[index]);
          if (mark) last.set(mark, index);
        }
      const out = nodes.slice(0, start);
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index]!;
        if (!isElement(node)) {
          out.push(node);
          continue;
        }
        const mark = markOf(node);
        if (mark && !inParagraph) {
          const end = last.get(mark)!;
          const run = nodes.slice(index, end + 1);
          run.forEach(clear);
          const paragraph: ElementNode = ["p", {}];
          for (const item of run) paragraph.push(item);
          out.push(paragraph);
          index = end;
          continue;
        }
        if (node[0] === "fragment" && markOf(node[2])) node[0] = "p";
        if (mark) delete node[1][MARK];
        restore(asList(node), 2, inParagraph || node[0] === "p");
        out.push(node);
      }
      nodes.length = 0;
      for (const item of out) nodes.push(item);
    };
    restore(state.tree.nodes, 0, false);
  },
});

/**
 * With Markdown off inside HTML blocks, Comark leaves their character references as written (`&lt;a&gt;` shows as
 * typed). Runs after html(): only text that came from an HTML block is decoded, once; Markdown text was decoded by
 * markdown-exit already.
 */
export const htmlEntities = (): ComarkPlugin => ({
  name: "marked-to-comark:html-entities",
  markdownItPost(state) {
    for (const token of state.tokens) {
      if (token.type !== "inline" || !token.map || !htmlBlockMaps.has(token.map)) continue;
      for (const child of token.children ?? [])
        if (child.type === "text" && child.content.includes("&"))
          child.content = decodeHTML(child.content);
    }
  },
});

/**
 * remark-rehype drops raw HTML unless told otherwise, and remark-html sanitizes by default. Named `html` so it takes
 * the place of Comark's html plugin: HTML is still tokenized, then removed, instead of showing up as text.
 */
export const dropHtml = (): ComarkPlugin => ({
  name: "html",
  markdownItPlugins: [(md: MarkdownExit) => md.set({ html: true })],
  markdownItPost(state) {
    const tokens = state.tokens.filter((token) => token.type !== "html_block");
    for (const token of tokens)
      if (token.children)
        token.children = token.children.filter((child) => child.type !== "html_inline");
    state.tokens = tokens;
  },
});
