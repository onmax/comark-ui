import type { ComarkPlugin, ElementNode, Node } from "comark";
import { decodeHTML } from "entities";

export interface MarkedHighlightOptions {
  /** The project's highlighter: code, the fence's first word, and the whole fence info. Returns HTML, or the code as it is. */
  highlight: (code: string, lang: string, info: string) => string | Promise<string>;
  /** The class before the language on `<code>`; marked-highlight's default is `language-`. */
  langPrefix?: string;
  /** The class on `<code>` when the fence names no language. */
  emptyLangClass?: string;
  /** marked-highlight's flag for an async highlighter; Comark awaits the result either way. */
  async?: boolean;
}

const isString = (value: unknown): value is string => value === String(value);
const childrenOf = ([, , ...children]: ElementNode): Node[] => children;

/** The highlighter's HTML as Comark nodes: its tags (spans, mostly) with their attributes, and decoded text. */
function toNodes(html: string): Node[] {
  const root: Node[] = [];
  // Where the next node goes: the root, or the innermost tag still open.
  const open: { name: string; into: Node[] }[] = [{ name: "", into: root }];
  for (const part of html.split(/(<\/?[A-Za-z][\w-]*(?:\s+[^<>]*?)?\/?>)/)) {
    if (!part) continue;
    const close = /^<\/([A-Za-z][\w-]*)\s*>$/.exec(part);
    const start = /^<([A-Za-z][\w-]*)((?:\s+[^<>]*?)?)(\/?)>$/.exec(part);
    if (close) {
      const at = open.findLastIndex(
        (item, index) => index > 0 && item.name === close[1]!.toLowerCase(),
      );
      if (at > 0) open.length = at;
    } else if (start) {
      const attributes: Record<string, string | true> = {};
      for (const match of start[2]!.matchAll(
        /([:\w.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
      )) {
        const value = match[2] ?? match[3] ?? match[4];
        attributes[match[1]!.toLowerCase()] = value === undefined ? true : decodeHTML(value);
      }
      const element: ElementNode = [start[1]!.toLowerCase(), attributes];
      open.at(-1)!.into.push(element);
      if (!start[3]) {
        // SAFETY: an element's children follow its tag and attributes, so pushing onto its own array adds children.
        const into = element as Node[];
        open.push({ name: element[0], into });
      }
    } else open.at(-1)!.into.push(decodeHTML(part));
  }
  return root;
}

/**
 * marked-highlight for Comark: the same options, and the same `<code>` it writes. The project's own highlighter
 * (highlight.js, Prism) runs on each code block, so the colors and classes stay as they were.
 */
export const markedHighlight = (
  options: MarkedHighlightOptions | MarkedHighlightOptions["highlight"],
): ComarkPlugin => {
  const settings = options instanceof Function ? { highlight: options } : options;
  const prefix = settings.langPrefix ?? "language-";
  const empty = settings.emptyLangClass ?? "";
  return {
    name: "marked-to-comark:marked-highlight",
    async post(state) {
      const blocks: { pre: ElementNode; code: ElementNode }[] = [];
      const visit = (nodes: Node[]) => {
        for (const node of nodes) {
          if (!Array.isArray(node) || node[0] === null) continue;
          const code = node[2];
          if (node[0] === "pre" && !node[1].$?.html && Array.isArray(code) && code[0] === "code")
            blocks.push({ pre: node, code });
          else visit(childrenOf(node));
        }
      };
      visit(state.tree.nodes);
      for (const { pre, code } of blocks) {
        const attributes = pre[1];
        const text = code.slice(2).filter(isString).join("");
        const info = [attributes.language, attributes.meta]
          .filter((part) => isString(part) && part)
          .join(" ");
        const lang = /\S*/.exec(info)![0];
        const html = await settings.highlight(text, lang, info);
        const classes = lang ? `${prefix}${lang}` : empty;
        if (classes) code[1].class = classes;
        else delete code[1].class;
        code.length = 2;
        // A highlighter that returns the code unchanged leaves it as text, as marked-highlight leaves it unescaped.
        // SAFETY: from index 2 on an element holds its children, and `code.length = 2` kept only the tag and attributes.
        (code as Node[]).push(...(isString(html) && html !== text ? toNodes(html) : [text]));
      }
    },
  };
};
