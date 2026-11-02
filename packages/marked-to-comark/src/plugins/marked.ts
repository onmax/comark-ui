import type {
  ComarkParseTokensState,
  ComarkPlugin,
  ElementNode,
  MarkdownExitPlugin,
  Node,
} from "comark";
import { decodeHTML } from "entities";
import { fromHtmlBlock } from "./gfm.ts";

/** An element's children: everything after its tag and attributes. */
const childrenOf = ([, , ...children]: ElementNode): Node[] => children;
const isString = (value: unknown): value is string => value === String(value);

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
        if (/^(ul|ol|li|input)$/.test(node[0]) && isString(attributes.class)) {
          const kept = attributes.class
            .split(/\s+/)
            .filter((name) => name && !TASK_CLASSES.has(name));
          if (kept.length) attributes.class = kept.join(" ");
          else delete attributes.class;
        }
        visit(childrenOf(node));
      }
    };
    visit(state.tree.nodes);
  },
});

const MARK = "data-marked-to-comark-html";
const SPANS = /^(strong|em|link|s|sup|sub|mdc_inline_span)_(open|close)$/;

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
        // Comark parses an attribute that holds a JSON object, so the tag's own attributes ride in the marker.
        start.attrs = [[MARK, JSON.stringify(attributes(open[2] ?? ""))]];
        children[index] = start;
        children[close] = new Make("mdc_inline_span_close", name, -1);
      }
    }
  },
  post(state) {
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!Array.isArray(node) || node[0] === null) continue;
        const held: unknown = node[1][MARK];
        if (held instanceof Object) node[1] = { $: { html: 1, block: 0 }, ...held };
        visit(childrenOf(node));
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
      if (isString(node)) return node;
      if (!Array.isArray(node) || node[0] === null) return "";
      const [tag, attributes] = node;
      if (tag === "img" && !attributes.$?.html)
        return isString(attributes.alt) ? attributes.alt : "";
      const inner = plainText(childrenOf(node));
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
          if (node[1].id === undefined) node[1].id = prefix + slug(plainText(childrenOf(node)));
          continue;
        }
        visit(childrenOf(node));
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
          isString(code[1].class)
        )
          code[1].class = code[1].class.replace(/^language-/, prefix);
        visit(childrenOf(node));
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
      if (block.type !== "inline" || !block.children || fromHtmlBlock(block)) continue;
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

/**
 * An HTML block may be indented up to three spaces; Comark reads the indent as text and wraps the block in a `<p>`.
 * Its first line loses the indent, which HTML doesn't render.
 */
export const htmlIndent = (): ComarkPlugin => ({
  name: "marked-to-comark:html-indent",
  markdownItPost(state) {
    for (const token of state.tokens)
      if (token.type === "html_block") token.content = token.content.replace(/^[ \t]+/, "");
  },
});

/**
 * Comark's html plugin turns each HTML block into a paragraph around its content, and drops that paragraph only when
 * the content starts with a tag and holds no text of its own; `<div></div>{% x %}` keeps a `<p>` a browser never
 * draws. Runs after html(): the wrapper of an HTML block whose tags all close inside it goes. A block that leaves a tag
 * open (`<details>`) keeps it, since the tree builder reads the wrapper as the sign that what follows nests inside.
 */
function balanced(children: Token[]): boolean {
  const open: string[] = [];
  for (const child of children) {
    if (child.type !== "html_inline") continue;
    const tag = /^<(\/?)([A-Za-z][\w-]*)[^>]*?(\/?)>$/.exec(child.content.trim());
    if (!tag || tag[3] || VOID_TAGS.test(tag[2]!.toLowerCase())) continue;
    if (!tag[1]) open.push(tag[2]!.toLowerCase());
    else if (open.at(-1) === tag[2]!.toLowerCase()) open.pop();
    else return false;
  }
  return open.length === 0;
}

export const htmlBlocks = (): ComarkPlugin => ({
  name: "marked-to-comark:html-blocks",
  markdownItPost(state) {
    const tokens = state.tokens;
    for (let index = tokens.length - 3; index >= 0; index--)
      if (
        tokens[index]!.type === "paragraph_open" &&
        tokens[index + 1]!.type === "inline" &&
        fromHtmlBlock(tokens[index + 1]!) &&
        tokens[index + 2]!.type === "paragraph_close" &&
        balanced(tokens[index + 1]!.children ?? [])
      ) {
        tokens.splice(index + 2, 1);
        tokens.splice(index, 1);
      }
  },
});

/**
 * Inside an HTML block, Comark keeps everything between `<pre>` and `</pre>` as text, so `<pre><code>…</code></pre>`
 * shows its `<code>` tags. A browser parses them. Runs after html() and before the entity decoding: the text between
 * the tags becomes tag and text tokens again.
 */
export const htmlPre = (): ComarkPlugin => ({
  name: "marked-to-comark:html-pre",
  markdownItPost(state) {
    for (const block of state.tokens) {
      const children = block.children;
      if (block.type !== "inline" || !children || !fromHtmlBlock(block)) continue;
      // SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
      const Make = (children[0]?.constructor ?? block.constructor) as TokenClass;
      const out: Token[] = [];
      let inPre = false;
      for (const token of children) {
        if (token.type === "html_inline" && /^<pre[\s>]/i.test(token.content)) inPre = true;
        else if (token.type === "html_inline" && /^<\/pre\s*>/i.test(token.content)) inPre = false;
        if (!inPre || token.type !== "text" || !/<\/?[A-Za-z]/.test(token.content)) {
          out.push(token);
          continue;
        }
        for (const part of token.content.split(/(<\/?[A-Za-z][\w-]*(?:\s+[^<>]*?)?\/?>)/)) {
          if (!part) continue;
          const piece = new Make(/^<\/?[A-Za-z]/.test(part) ? "html_inline" : "text", "", 0);
          piece.content = part;
          out.push(piece);
        }
      }
      block.children = out;
    }
  },
});

/**
 * markdown-exit shows an autolink's text percent-decoded (`a%20b` reads `a b`); marked shows the URL as written.
 * When the paragraph's source holds the URL as the href spells it, that's the text.
 */
export const linkText = (): ComarkPlugin => ({
  name: "marked-to-comark:link-text",
  markdownItPost(state) {
    for (const block of state.tokens) {
      const children = block.children;
      if (block.type !== "inline" || !children) continue;
      for (let index = 0; index + 1 < children.length; index++) {
        const open = children[index]!;
        const text = children[index + 1]!;
        if (
          open.type !== "link_open" ||
          !/^(linkify|autolink)$/.test(open.markup) ||
          text.type !== "text"
        )
          continue;
        const href = open.attrs?.find(([name]) => name === "href")?.[1] ?? "";
        if (href.startsWith("mailto:")) continue;
        const written = /^https?:\/\//i.test(text.content) ? href : href.replace(/^http:\/\//i, "");
        if (
          written !== text.content &&
          block.content.includes(written) &&
          !block.content.includes(text.content)
        )
          text.content = written;
      }
    }
  },
});

/** A browser reads a stray `</br>` as `<br>`, as the HTML parser specifies; Comark drops it as a closing tag. */
export const breakEndTags = (): ComarkPlugin => ({
  name: "marked-to-comark:break-end-tags",
  markdownItPost(state) {
    for (const token of state.tokens) {
      if (token.type === "html_block") token.content = token.content.replace(/<\/br\s*>/gi, "<br>");
      for (const child of token.children ?? [])
        if (child.type === "html_inline" && /^<\/br\s*>$/i.test(child.content))
          child.content = "<br>";
    }
  },
});

/**
 * An empty ATX heading (`##` alone) is an empty `<h2>` in CommonMark and marked, and keeps its margin on the page;
 * Comark drops it. Before html() runs, it becomes the HTML block `<h2></h2>`.
 */
export const emptyHeadings = (): ComarkPlugin => ({
  name: "marked-to-comark:empty-headings",
  markdownItPost(state) {
    const tokens = state.tokens;
    for (let index = tokens.length - 3; index >= 0; index--) {
      const open = tokens[index]!;
      if (
        open.type !== "heading_open" ||
        tokens[index + 1]!.content.trim() ||
        tokens[index + 2]!.type !== "heading_close"
      )
        continue;
      // SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
      const block = new (open.constructor as TokenClass)("html_block", "", 0);
      block.content = `<${open.tag}></${open.tag}>\n`;
      block.map = open.map;
      tokens.splice(index, 3, block);
    }
  },
});

/**
 * marked before v14 rewrote tabs before parsing: before v4 every tab became four spaces, from v4 only a line's leading
 * tabs did. Code blocks show it, so the same happens before Comark parses.
 */
export const expandTabs = (mode: "all" | "leading"): ComarkPlugin => ({
  name: "marked-to-comark:expand-tabs",
  pre(state) {
    state.markdown =
      mode === "all"
        ? state.markdown.replace(/\t/g, "    ")
        : state.markdown.replace(
            /^( *)(\t+)/gm,
            (_, spaces: string, tabs: string) => spaces + "    ".repeat(tabs.length),
          );
  },
});

// A tag whose name holds an underscore, which CommonMark doesn't allow and marked from v1 to v17 read as HTML.
const UNDERSCORE_TAG =
  /^(?:<[A-Za-z][\w-]*_[\w-]*(?:\s+[A-Za-z_:][\w.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>|<\/[A-Za-z][\w-]*_[\w-]*\s*>)/;

/**
 * marked from v1 to v17 reads `<GRAFANA_VERSION>` and `<my_el>` as HTML, and a browser hides them; CommonMark and
 * Comark show them as text, since a tag name can't hold an underscore. Inline they become HTML, and one alone on a line
 * starts an HTML block that ends at a blank line, as any other tag would.
 */
export const underscoreTags = (): ComarkPlugin => ({
  name: "marked-to-comark:underscore-tags",
  markdownItPlugins: [
    ((md) => {
      md.inline.ruler.before("html_inline", "marked_underscore_tag", (state, silent) => {
        if (state.src.charCodeAt(state.pos) !== 0x3c) return false;
        const tag = UNDERSCORE_TAG.exec(state.src.slice(state.pos));
        if (!tag) return false;
        if (!silent) state.push("html_inline", "", 0).content = tag[0];
        state.pos += tag[0].length;
        return true;
      });
      md.block.ruler.before(
        "html_block",
        "marked_underscore_block",
        (state, start, end, silent) => {
          if (state.sCount[start]! - state.blkIndent >= 4) return false;
          const line = state.src.slice(
            state.bMarks[start]! + state.tShift[start]!,
            state.eMarks[start],
          );
          const tag = UNDERSCORE_TAG.exec(line);
          // Like CommonMark's last kind of HTML block: the tag alone on its line, and it can't interrupt a paragraph.
          if (!tag || line.slice(tag[0].length).trim() || silent) return false;
          let next = start + 1;
          while (next < end && !state.isEmpty(next)) next++;
          const token = state.push("html_block", "", 0);
          token.map = [start, next];
          token.content = state.getLines(start, next, state.blkIndent, true);
          state.line = next;
          return true;
        },
      );
    }) satisfies MarkdownExitPlugin,
  ],
});

/** After html(): in an HTML block's text, the underscore tags html() left as text become tags again. */
export const underscoreTagText = (): ComarkPlugin => ({
  name: "marked-to-comark:underscore-tag-text",
  markdownItPost(state) {
    const pattern = new RegExp(`(${UNDERSCORE_TAG.source.slice(1)})`, "g");
    for (const block of state.tokens) {
      const children = block.children;
      if (block.type !== "inline" || !children || !fromHtmlBlock(block)) continue;
      // SAFETY: Comark's tokens are instances of markdown-exit's Token class, which takes a type, a tag, and a nesting.
      const Make = (children[0]?.constructor ?? block.constructor) as TokenClass;
      block.children = children.flatMap((token) => {
        if (token.type !== "text" || !/<\/?[A-Za-z][\w-]*_/.test(token.content)) return [token];
        return token.content
          .split(pattern)
          .filter(Boolean)
          .map((part) =>
            Object.assign(new Make(UNDERSCORE_TAG.test(part) ? "html_inline" : "text", "", 0), {
              content: part,
            }),
          );
      });
    }
  },
});

const PAD = "marked-to-comark-pad";
const DELIMITER = /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/;

/**
 * Tables as marked 0.3 split them: every `|` ends a cell, escaped or in a code span, and each row keeps the cells it
 * has, more or fewer than the header; GFM pads or trims rows to the header. Each table is rewritten with the cells
 * marked found, padded to its widest row with marker cells that come out again after parsing.
 */
export const legacyTables = (): ComarkPlugin => ({
  name: "marked-to-comark:legacy-tables",
  pre(state) {
    const lines = state.markdown.split("\n");
    let fence: string | undefined;
    for (let index = 0; index + 1 < lines.length; index++) {
      const line = lines[index]!;
      const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (marker && (!fence || marker.startsWith(fence))) fence = fence ? undefined : marker;
      if (
        fence ||
        !line.includes("|") ||
        !DELIMITER.test(lines[index + 1]!) ||
        !lines[index + 1]!.includes("-")
      )
        continue;
      const piped = /^ *\|/.test(line);
      let end = index + 2;
      while (
        end < lines.length &&
        lines[end]!.includes("|") &&
        lines[end]!.trim() &&
        (!piped || /^ *\|/.test(lines[end]!))
      )
        end++;
      // marked 0.3's own splitting: trim the outer pipes, then every pipe divides.
      const cells = (row: string) => row.replace(/^ *\| *| *\| *$/g, "").split(/ *\| */);
      const rows = [line, ...lines.slice(index + 2, end)].map(cells);
      const width = Math.max(...rows.map((row) => row.length));
      const write = (row: string[]) =>
        `| ${[...row.map((cell) => cell.replace(/\\$/, "\\\\")), ...Array<string>(width - row.length).fill(PAD)].join(" | ")} |`;
      const delimiter = cells(lines[index + 1]!);
      lines[index] = write(rows[0]!);
      lines[index + 1] =
        `| ${[...delimiter, ...Array<string>(width - delimiter.length).fill("---")].join(" | ")} |`;
      for (let row = 1; row < rows.length; row++) lines[index + 1 + row] = write(rows[row]!);
      index = end - 1;
    }
    state.markdown = lines.join("\n");
  },
  post(state) {
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!Array.isArray(node) || node[0] === null) continue;
        if (node[0] === "tr")
          for (let index = node.length - 1; index >= 2; index--) {
            const cell = node[index];
            if (Array.isArray(cell) && cell.length === 3 && cell[2] === PAD) node.splice(index, 1);
          }
        visit(childrenOf(node));
      }
    };
    visit(state.tree.nodes);
  },
});
