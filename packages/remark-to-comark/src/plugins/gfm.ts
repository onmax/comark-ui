import type {
  ComarkParseTokensState,
  ComarkPlugin,
  ElementNode,
  MarkdownExitPlugin,
  Node,
} from "comark";
import { decodeHTML } from "entities";
import markdownItFootnote from "markdown-it-footnote";

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
  name: "remark-to-comark:commonmark",
  markdownItPlugins: [(md: MarkdownExit) => md.disable(["table", "strikethrough"])],
});

export const tightLists = (): ComarkPlugin => ({
  name: "remark-to-comark:tight-lists",
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
  name: "remark-to-comark:gfm-links",
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

interface FootnoteMeta {
  id: number;
  subId?: number;
  label?: string;
}

interface BlockState {
  src: string;
  bMarks: number[];
  tShift: number[];
  tokens: unknown[];
  env: { footnotes?: { refs?: Record<string, number> } };
}
type BlockRule = (state: BlockState, start: number, end: number, silent: boolean) => boolean;

interface InlineRulerHost {
  use: (plugin: unknown) => unknown;
  inline: {
    ruler: { disable: (name: string) => void; __rules__: { name: string }[]; __cache__: unknown };
  };
  block: { ruler: { __rules__: { name: string; fn: BlockRule }[]; __cache__: unknown } };
}

/**
 * GFM footnotes with remark-gfm's markup. markdown-it-footnote finds references and definitions with markdown-exit's
 * own block and inline rules, so definitions inside quotes and lists, lazy lines, escapes, and link definitions
 * behave as in CommonMark; its tokens are then rewritten into ones Comark's tree builder knows.
 */
export const footnotes = (): ComarkPlugin => ({
  name: "footnotes",
  // SAFETY: Comark runs these on its markdown-exit instance, a port of markdown-it that keeps the `__rules__` and `__cache__` markdown-it-footnote and this plugin reach into.
  markdownItPlugins: [
    (md: InlineRulerHost) => {
      md.use(markdownItFootnote);
      // `^[inline]` footnotes are a markdown-it extension that GFM doesn't have.
      md.inline.ruler.disable("footnote_inline");
      // A reference must win over Comark's `[span]`, which would otherwise read `[^a]` first.
      const rules = md.inline.ruler.__rules__;
      const [ref] = rules.splice(
        rules.findIndex((rule) => rule.name === "footnote_ref"),
        1,
      );
      const span = rules.findIndex((rule) => rule.name === "comark_inline_span");
      rules.splice(span >= 0 ? span : rules.findIndex((rule) => rule.name === "link"), 0, ref!);
      md.inline.ruler.__cache__ = null;
      // remark keeps the first definition of a label; markdown-it-footnote keeps the last. A repeat still consumes its
      // lines, so its text doesn't show up as a paragraph, but its tokens are dropped.
      const definition = md.block.ruler.__rules__.find((rule) => rule.name === "footnote_def")!;
      const original = definition.fn;
      definition.fn = (state, start, end, silent) => {
        if (silent) return original(state, start, end, silent);
        const at = state.bMarks[start]! + state.tShift[start]!;
        const label = /^\[\^([^\]\s]+)\]:/.exec(state.src.slice(at, at + 1000))?.[1];
        const repeated = label !== undefined && state.env.footnotes?.refs?.[`:${label}`] === -1;
        const before = state.tokens.length;
        const matched = original(state, start, end, silent);
        if (matched && repeated) state.tokens.length = before;
        return matched;
      };
      md.block.ruler.__cache__ = null;
    },
  ] as never,
  markdownItPost(state) {
    const tokens = state.tokens;
    if (!tokens.some((token) => token.type === "footnote_block_open")) return;
    const Token = tokenClass(tokens[0]!);
    const make = (
      type: string,
      tag: string,
      nesting: Token["nesting"],
      attrs?: [string, string][],
      content = "",
    ) => {
      const token = new Token(type, tag, nesting);
      if (attrs) token.attrs = attrs;
      token.content = content;
      return token;
    };
    const labels = new Map<number, string>();
    for (const token of tokens)
      if (token.type === "footnote_open")
        labels.set(token.meta!.id, (token.meta!.label ?? String(token.meta!.id + 1)).toLowerCase());
    const key = (meta: FootnoteMeta | null) => labels.get(meta!.id) ?? String(meta!.id + 1);
    const suffix = (meta: FootnoteMeta | null) => (meta!.subId ? `-${meta!.subId + 1}` : "");

    const out: Token[] = [];
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]!;
      if (token.children) {
        token.children = token.children.flatMap((ref) => {
          if (ref.type !== "footnote_ref") return [ref];
          return [
            make("sup_open", "sup", 1),
            make("link_open", "a", 1, [
              ["href", `#user-content-fn-${key(ref.meta)}`],
              ["id", `user-content-fnref-${key(ref.meta)}${suffix(ref.meta)}`],
              ["data-footnote-ref", ""],
              ["aria-describedby", "footnote-label"],
            ]),
            make("text", "", 0, undefined, String(ref.meta!.id + 1)),
            make("link_close", "a", -1),
            make("sup_close", "sup", -1),
          ];
        });
      }
      switch (token.type) {
        case "footnote_block_open": {
          const title = make("inline", "", 0, undefined, "Footnotes");
          title.children = [make("text", "", 0, undefined, "Footnotes")];
          out.push(
            make("mdc_block_slot_open", "section", 1, [
              ["data-footnotes", ""],
              ["class", "footnotes"],
            ]),
            make("heading_open", "h2", 1, [
              ["class", "sr-only"],
              ["id", "footnote-label"],
            ]),
            title,
            make("heading_close", "h2", -1),
            make("ordered_list_open", "ol", 1),
          );
          break;
        }
        case "footnote_block_close":
          out.push(
            make("ordered_list_close", "ol", -1),
            make("mdc_block_slot_close", "section", -1),
          );
          break;
        case "footnote_open":
          out.push(make("list_item_open", "li", 1, [["id", `user-content-fn-${key(token.meta)}`]]));
          break;
        case "footnote_close":
          out.push(make("list_item_close", "li", -1));
          break;
        case "footnote_anchor": {
          // Back links go at the end of the note's last paragraph, after a space.
          const backref = [
            make("text", "", 0, undefined, " "),
            make("link_open", "a", 1, [
              ["href", `#user-content-fnref-${key(token.meta)}${suffix(token.meta)}`],
              ["data-footnote-backref", ""],
              ["aria-label", `Back to reference ${token.meta!.id + 1}${suffix(token.meta)}`],
              ["class", "data-footnote-backref"],
            ]),
            make("text", "", 0, undefined, "↩"),
            ...(token.meta!.subId
              ? [
                  make("sup_open", "sup", 1),
                  make("text", "", 0, undefined, String(token.meta!.subId + 1)),
                  make("sup_close", "sup", -1),
                ]
              : []),
            make("link_close", "a", -1),
          ];
          // The note's last paragraph: link definitions after it (`reference` tokens) render nothing.
          let end = out.length - 1;
          while (out[end]?.type === "reference") end--;
          const last =
            out[end]?.type === "paragraph_close" && out[end - 1]?.type === "inline"
              ? out[end - 1]
              : out[end];
          if (last?.type === "inline") last.children?.push(...backref);
          else {
            // A note that ends in a code block or list gets its back links straight in the item, as remark-gfm does.
            const links = make("inline", "", 0);
            links.children = backref.slice(1);
            out.push(links);
          }
          break;
        }
        default:
          out.push(token);
      }
    }
    state.tokens = out;
  },
});

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
  name: "remark-to-comark:close-inline-html",
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
  name: "remark-to-comark:image-alt",
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
  name: "remark-to-comark:html-whitespace",
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

const MARK = "data-remark-to-comark-p";
let parses = 0;

/**
 * Comark drops the `<p>` around a paragraph that holds only HTML (`<video …></video>`, linked badges), treating it
 * like an HTML block; CommonMark keeps it. Every opening tag of such a paragraph carries a mark through parsing, with
 * a value unique to this parse so an authored attribute of the same name can't pass for one, and each run of marked
 * siblings that lost its paragraph gets it back.
 */
export const htmlParagraphs = (): ComarkPlugin => ({
  name: "remark-to-comark:html-paragraphs",
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
  name: "remark-to-comark:html-entities",
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
