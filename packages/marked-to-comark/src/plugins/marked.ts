import type { ComarkParseTokensState, ComarkPlugin, Node } from "comark";
import { decodeHTML } from "entities";

type Token = ComarkParseTokensState["tokens"][number];
type TokenClass = new (type: string, tag: string, nesting: Token["nesting"]) => Token;

/**
 * marked's `breaks: true`: every line break inside a paragraph is a `<br>`. It works on markdown-exit's tokens and
 * runs before the HTML whitespace workaround, which turns soft breaks into text.
 */
export const breaks = (): ComarkPlugin => ({
  name: "marked-to-comark:breaks",
  markdownItPost(state) {
    for (const block of state.tokens) {
      if (block.type !== "inline" || !block.children) continue;
      for (let index = 0; index < block.children.length; index++) {
        const token = block.children[index]!;
        if (token.type !== "softbreak") continue;
        // SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
        const Make = token.constructor as TokenClass;
        const hard = new Make("hardbreak", "br", 0);
        block.children[index] = hard;
      }
    }
  },
});

const TASK_CLASSES = new Set(["contains-task-list", "task-list-item", "task-list-item-checkbox"]);

/** marked writes task lists without GitHub's classes; Comark adds them to the list, its items, and the checkboxes. */
export const taskListClasses = (): ComarkPlugin => ({
  name: "marked-to-comark:task-list-classes",
  post(state) {
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!Array.isArray(node) || node[0] === null) continue;
        const attributes = node[1];
        if (/^(ul|ol|li|input)$/.test(node[0]) && typeof attributes.class === "string") {
          const kept = attributes.class
            .split(/\s+/)
            .filter((name) => name && !TASK_CLASSES.has(name));
          if (kept.length) attributes.class = kept.join(" ");
          else delete attributes.class;
        }
        visit(node.slice(2) as Node[]);
      }
    };
    visit(state.tree.nodes);
  },
});

/**
 * marked drops one trailing blank line from a fenced code block (`a`, blank, closing fence renders as `a`); CommonMark
 * and Comark keep it. Copied so the code reads as it did.
 */
export const codeNewline = (): ComarkPlugin => ({
  name: "marked-to-comark:code-newline",
  post(state) {
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!Array.isArray(node) || node[0] === null) continue;
        if (node[0] === "pre" && !node[1].$?.html) {
          const code = node[2];
          if (Array.isArray(code) && code[0] === "code") {
            const last = code.length - 1;
            if (last >= 2 && typeof code[last] === "string")
              code[last] = (code[last] as string).replace(/\n$/, "");
          }
          continue;
        }
        visit(node.slice(2) as Node[]);
      }
    };
    visit(state.tree.nodes);
  },
});

const MARK = "data-marked-to-comark-html";
const SPANS = /^(strong|em|link|s|sup|sub|mdc_inline_span)_(open|close)$/;
let parses = 0;

/** An inline tag's attributes as Comark reads them from HTML: lowercased names, decoded values, `true` when bare. */
function attributes(text: string): Record<string, string | true> {
  const found: Record<string, string | true> = {};
  for (const match of text.matchAll(
    /([:\w.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  )) {
    const value = match[2] ?? match[3] ?? match[4];
    found[match[1]!.toLowerCase()] = value === undefined ? true : decodeHTML(value);
  }
  return found;
}

/**
 * Inside emphasis or link text, Comark gives an inline tag no children: `**a <b>c</b>**` renders `<strong>a c<b></b>
 * </strong>`, because those spans collect their children without the open tag seeing them. Each matched tag pair in a
 * span becomes a pair of span tokens the tree builder nests, marked so their attributes come back as HTML's.
 */
export const inlineHtml = (): ComarkPlugin => ({
  name: "marked-to-comark:inline-html",
  markdownItPost(state) {
    const parse = String(++parses);
    const held: Record<string, string | true>[] = [];
    for (const block of state.tokens) {
      const children = block.children;
      if (block.type !== "inline" || !children) continue;
      let depth = 0;
      for (let index = 0; index < children.length; index++) {
        const token = children[index]!;
        const span = SPANS.exec(token.type);
        if (span) depth += span[2] === "open" ? 1 : -1;
        if (token.type !== "html_inline" || depth === 0) continue;
        const open = /^<([A-Za-z][\w:-]*)((?:\s+[\s\S]*?)?)\s*>$/.exec(token.content.trim());
        if (
          !open ||
          /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i.test(open[1]!)
        )
          continue;
        const name = open[1]!.toLowerCase();
        // The matching close at the same depth of spans, with no span opening or closing in between.
        let level = 0;
        let close = -1;
        for (let next = index + 1; next < children.length; next++) {
          const other = children[next]!;
          if (SPANS.test(other.type)) break;
          if (other.type !== "html_inline") continue;
          const tag = /^<(\/?)([A-Za-z][\w:-]*)/.exec(other.content.trim());
          if (!tag || tag[2]!.toLowerCase() !== name) continue;
          if (!tag[1]) level++;
          else if (level) level--;
          else {
            close = next;
            break;
          }
        }
        if (close === -1) continue;
        // SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
        const Make = token.constructor as TokenClass;
        const start = new Make("mdc_inline_span_open", name, 1);
        start.attrs = [[MARK, `${parse}:${held.length}`]];
        held.push(attributes(open[2] ?? ""));
        children[index] = start;
        children[close] = new Make("mdc_inline_span_close", name, -1);
      }
    }
    (state as { inlineHtml?: unknown }).inlineHtml = { parse, held };
  },
  post(state) {
    const found = (
      state as { inlineHtml?: { parse: string; held: Record<string, string | true>[] } }
    ).inlineHtml;
    if (!found?.held.length) return;
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!Array.isArray(node) || node[0] === null) continue;
        const mark = node[1][MARK];
        if (typeof mark === "string" && mark.startsWith(`${found.parse}:`)) {
          node[1] = {
            $: { html: 1, block: 0 },
            ...found.held[Number(mark.slice(found.parse.length + 1))],
          };
        }
        visit(node.slice(2) as Node[]);
      }
    };
    visit(state.tree.nodes);
  },
});

const VOID_TAGS = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;

/**
 * A heading's text as marked's text renderer reads it: text, code, and image alt. Raw HTML stays in it, as marked
 * passed it on; the slugger then drops the tags, or before 0.6 slugs them too.
 */
const plainText = (nodes: Node[]): string =>
  nodes
    .map((node) => {
      if (typeof node === "string") return node;
      if (!Array.isArray(node) || node[0] === null) return "";
      const [tag, attributes] = node;
      if (tag === "img" && !attributes.$?.html) return typeof attributes.alt === "string" ? attributes.alt : "";
      const inner = plainText(node.slice(2) as Node[]);
      if (!attributes.$?.html) return inner;
      const written = Object.entries(attributes)
        .filter(([name]) => name !== "$")
        .map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${String(value)}"`))
        .join("");
      return `<${tag}${written}>${VOID_TAGS.test(tag) ? "" : `${inner}</${tag}>`}`;
    })
    .join("");

/**
 * Heading ids as marked before v8 wrote them by default (`headerIds`), with its slugger: lowercased, punctuation
 * dropped, each whitespace character a hyphen, and `-1`, `-2` after repeats. `legacy` is marked before 0.6: every run
 * of other characters a hyphen, and no suffix for repeats. An id the author wrote stays.
 */
export const headerIds = (mode: true | "legacy" = true, prefix = ""): ComarkPlugin => ({
  name: "marked-to-comark:header-ids",
  post(state) {
    const seen: Record<string, number> = {};
    const slug = (value: string) => {
      if (mode === "legacy") return value.toLowerCase().replace(/[^\w]+/g, "-");
      const original = value
        .toLowerCase()
        .trim()
        .replace(/<[!/a-z].*?>/gi, "")
        .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "")
        .replace(/\s/g, "-");
      let id = original;
      let count = 0;
      if (Object.hasOwn(seen, id)) {
        count = seen[original]!;
        do id = `${original}-${++count}`;
        while (Object.hasOwn(seen, id));
      }
      seen[original] = count;
      seen[id] = 0;
      return id;
    };
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!Array.isArray(node) || node[0] === null) continue;
        if (/^h[1-6]$/.test(node[0]) && !node[1].$?.html) {
          if (node[1].id === undefined)
            node[1].id = prefix + slug(plainText(node.slice(2) as Node[]));
          continue;
        }
        visit(node.slice(2) as Node[]);
      }
    };
    visit(state.tree.nodes);
  },
});

/** marked's `langPrefix`: the class before a code block's language, `lang-` by default in 0.3. */
export const langPrefix = (prefix: string): ComarkPlugin => ({
  name: "marked-to-comark:lang-prefix",
  post(state) {
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!Array.isArray(node) || node[0] === null) continue;
        const code = node[2];
        if (
          node[0] === "pre" &&
          Array.isArray(code) &&
          code[0] === "code" &&
          typeof code[1].class === "string"
        )
          code[1].class = code[1].class.replace(/^language-/, prefix);
        visit(node.slice(2) as Node[]);
      }
    };
    visit(state.tree.nodes);
  },
});

// marked's GFM email autolink: a local part, `@`, and dotted labels ending in a letter or digit, with no TLD list.
const EMAIL = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/g;

/**
 * Email autolinks as marked finds them. markdown-exit's linkify checks the top-level domain against a list and won't
 * start an address after a `/`, so `@scope/pkg@1.2.3` (every changesets CHANGELOG) stays text in Comark; marked links
 * `pkg@1.2.3`. Linkify's own email links are undone and every text outside a link is searched again.
 */
export const markedEmails = (): ComarkPlugin => ({
  name: "marked-to-comark:emails",
  markdownItPost(state) {
    for (const block of state.tokens) {
      if (block.type !== "inline" || !block.children) continue;
      // SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
      const Make = (block.children[0]?.constructor ?? block.constructor) as TokenClass;
      const text = (content: string) => Object.assign(new Make("text", "", 0), { content });
      // Undo linkify's email links, merging their text back into the text around them.
      const flat: Token[] = [];
      for (let index = 0; index < block.children.length; index++) {
        const token = block.children[index]!;
        const close = block.children[index + 2];
        const href = token.attrs?.find(([name]) => name === "href")?.[1] ?? "";
        if (
          token.type === "link_open" &&
          token.markup === "linkify" &&
          href.startsWith("mailto:") &&
          close?.type === "link_close"
        ) {
          flat.push(text(block.children[index + 1]!.content));
          index += 2;
          continue;
        }
        flat.push(token);
      }
      const merged: Token[] = [];
      for (const token of flat) {
        const last = merged.at(-1);
        if (token.type === "text" && last?.type === "text") last.content += token.content;
        else merged.push(token);
      }
      const out: Token[] = [];
      let links = 0;
      let anchors = 0;
      for (const token of merged) {
        if (token.type === "link_open") links++;
        if (token.type === "link_close") links--;
        if (token.type === "html_inline") {
          if (/^<a[\s>]/i.test(token.content)) anchors++;
          else if (/^<\/a\s*>/i.test(token.content)) anchors = Math.max(0, anchors - 1);
        }
        if (token.type !== "text" || links > 0 || anchors > 0 || !token.content.includes("@")) {
          out.push(token);
          continue;
        }
        let at = 0;
        for (const match of token.content.matchAll(EMAIL)) {
          if (match.index > at) out.push(text(token.content.slice(at, match.index)));
          const open = new Make("link_open", "a", 1);
          open.attrs = [["href", `mailto:${match[0]}`]];
          open.markup = "linkify";
          open.info = "auto";
          const close = new Make("link_close", "a", -1);
          close.markup = "linkify";
          close.info = "auto";
          out.push(open, text(match[0]), close);
          at = match.index + match[0].length;
        }
        if (at < token.content.length) out.push(text(token.content.slice(at)));
      }
      block.children = out;
    }
  },
});
