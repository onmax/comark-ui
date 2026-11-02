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

/** The highlighter's HTML as Comark nodes: its tags (spans, mostly) with their attributes, and decoded text. */
function toNodes(html: string): Node[] {
  const root: Node[] = [];
  const stack: Node[][] = [root];
  const open: string[] = [];
  for (const part of html.split(/(<\/?[A-Za-z][\w-]*(?:\s+[^<>]*?)?\/?>)/)) {
    if (!part) continue;
    const close = /^<\/([A-Za-z][\w-]*)\s*>$/.exec(part);
    const start = /^<([A-Za-z][\w-]*)((?:\s+[^<>]*?)?)(\/?)>$/.exec(part);
    if (close) {
      const at = open.lastIndexOf(close[1]!.toLowerCase());
      if (at !== -1) {
        open.length = at;
        stack.length = at + 1;
      }
    } else if (start) {
      const attributes: Record<string, string | true> = {};
      for (const match of start[2]!.matchAll(
        /([:\w.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
      )) {
        const value = match[2] ?? match[3] ?? match[4];
        attributes[match[1]!.toLowerCase()] = value === undefined ? true : decodeHTML(value);
      }
      const element = [start[1]!.toLowerCase(), attributes] as unknown as Node[];
      stack.at(-1)!.push(element as unknown as Node);
      if (!start[3]) {
        open.push(start[1]!.toLowerCase());
        stack.push(element);
      }
    } else stack.at(-1)!.push(decodeHTML(part));
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
  const settings = typeof options === "function" ? { highlight: options } : options;
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
          else visit(node.slice(2) as Node[]);
        }
      };
      visit(state.tree.nodes);
      for (const { pre, code } of blocks) {
        const attributes = pre[1];
        const text = code
          .slice(2)
          .filter((child): child is string => typeof child === "string")
          .join("");
        const info = [attributes.language, attributes.meta]
          .filter((part) => typeof part === "string" && part)
          .join(" ");
        const lang = /\S*/.exec(info)![0];
        const html = await settings.highlight(text, lang, info);
        const classes = lang ? `${prefix}${lang}` : empty;
        if (classes) code[1].class = classes;
        else delete code[1].class;
        code.length = 2;
        // A highlighter that returns the code unchanged leaves it as text, as marked-highlight leaves it unescaped.
        (code as Node[]).push(
          ...(typeof html === "string" && html !== text ? toNodes(html) : [text]),
        );
      }
    },
  };
};
