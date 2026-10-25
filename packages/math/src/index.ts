import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import {
  addRule,
  type MarkdownExit,
  type StateBlock,
  type StateInline,
  type Token,
} from "../../../shared/markdown-it.ts";
import { type MathOutput, typesetter } from "./typeset.ts";

export type { MathOutput } from "./typeset.ts";

export interface MathOptions {
  /**
   * `"mathml"`, the default, typesets with Temml into MathML, which browsers draw with no script, font, or stylesheet.
   * `"html"` and `"htmlAndMathml"` use KaTeX's HTML instead, which needs `katex` installed and `katex/dist/katex.css`
   * on the page.
   */
  output?: MathOutput;
  /** TeX macros every formula can use, such as `{ "\\R": "\\mathbb{R}" }`. */
  macros?: Record<string, string>;
}

export type MathMeta = {
  /** One readable sentence per formula that couldn't be typeset. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/math/${string}`; message: string };

/**
 * What a formula becomes, and all its renderers read: its `tex`, `display` for display math, and `html`, the typeset
 * markup. A formula with no `html` couldn't be typeset, and renders its TeX.
 */
export type FormulaAttributes = { tex?: string; display?: boolean; html?: string };

const DOLLAR = 0x24;
const BACKSLASH = 0x5c;
const BACKTICK = 0x60;
const NEWLINE = 0x0a;
const isSpace = (code: number) => code === 0x20 || code === 0x09 || code === NEWLINE;
const isDigit = (code: number) => code >= 0x30 && code <= 0x39;
// `\[1\]` and `\[2, 3\]` are citations written so the brackets don't start a link.
const isCitation = (tex: string) => /^[\d\s,–-]+$/.test(tex);

type Delimiter = { open: string; close: string; display: boolean; multiline: boolean };
const DELIMITERS: Delimiter[] = [
  { open: "$$", close: "$$", display: true, multiline: true },
  { open: "\\[", close: "\\]", display: true, multiline: true },
  { open: "\\(", close: "\\)", display: false, multiline: false },
  { open: "$", close: "$", display: false, multiline: false },
];

/** Where `close` ends the formula that starts at `from`, or -1. A backtick ends the search, so code spans win. */
function closing(src: string, from: number, max: number, { close, multiline }: Delimiter) {
  for (let pos = from; pos < max; pos++) {
    const code = src.charCodeAt(pos);
    if (code === BACKTICK || (code === NEWLINE && !multiline)) return -1;
    if (src.startsWith(close, pos)) {
      // A lone `$` closes after a non-space and before a non-digit, as in Pandoc, so `$5 and $10` stay prices.
      if (close !== "$") return pos;
      if (!isSpace(src.charCodeAt(pos - 1)) && !isDigit(src.charCodeAt(pos + 1))) return pos;
    }
    if (code === BACKSLASH) pos++;
  }
  return -1;
}

function inline(state: StateInline, silent: boolean) {
  const { src, pos: start, posMax: max } = state;
  const first = src.charCodeAt(start);
  if (first !== DOLLAR && first !== BACKSLASH) return false;
  const delimiter = DELIMITERS.find(({ open }) => src.startsWith(open, start));
  if (!delimiter) return false;
  const from = start + delimiter.open.length;
  if (delimiter.open === "$" && (isSpace(src.charCodeAt(from)) || isDigit(src.charCodeAt(from))))
    return false;
  const end = closing(src, from, max, delimiter);
  if (end < 0) return false;
  const tex = src.slice(from, end).trim();
  if (!tex || (delimiter.open === "\\[" && isCitation(tex))) return false;
  if (!silent) {
    const token = state.push(delimiter.display ? "math_block" : "math_inline", "math", 0);
    token.content = tex;
    token.markup = delimiter.open;
  }
  state.pos = end + delimiter.close.length;
  return true;
}

/** `$$` or `\[` at the start of a line, closed at the end of that line or a later one before a blank line. */
function block(state: StateBlock, startLine: number, endLine: number, silent: boolean) {
  const indent = (line: number) => state.sCount[line] ?? 0;
  const lineAt = (line: number) =>
    state.src.slice((state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0), state.eMarks[line] ?? 0);
  if (indent(startLine) - state.blkIndent >= 4) return false;
  const head = lineAt(startLine);
  const delimiter = DELIMITERS.find(({ open, display }) => display && head.startsWith(open));
  if (!delimiter) return false;
  const { open, close } = delimiter;
  const lines: string[] = [];
  let line = startLine;
  let text = head.slice(open.length);
  for (;;) {
    const at = text.indexOf(close);
    if (at >= 0) {
      if (text.slice(at + close.length).trim()) return false;
      lines.push(text.slice(0, at));
      break;
    }
    lines.push(text);
    line++;
    if (line >= endLine) return false;
    text = lineAt(line);
    if (!text.trim() || indent(line) < state.blkIndent) return false;
  }
  const tex = lines.join("\n").trim();
  if (!tex || (open === "\\[" && isCitation(tex))) return false;
  if (silent) return true;
  const token = state.push("math_block", "math", 0);
  token.content = tex;
  token.markup = open;
  token.block = true;
  token.map = [startLine, line + 1];
  state.line = line + 1;
  return true;
}

// At module level, so every parse reuses Comark's cached parser. The inline rule goes before `escape`, which would
// otherwise read `\(` and `\[` as escaped brackets.
const markdownIt = (md: MarkdownExit) => {
  addRule(md.inline.ruler, "before", ["escape"], "math_inline", inline);
  addRule(md.block.ruler, "before", ["fence"], "math_block", block, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
};

// A collision-free tag per parse distinguishes generated tokens from authored components.
let nextParse = 0;
const generated = new WeakMap<
  object,
  { tag: string; formulas: { tex: string; display: boolean }[] }
>();

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const MAX_QUOTED = 60;
const quoted = (tex: string) => {
  const line = tex.replace(/\s+/g, " ");
  return line.length > MAX_QUOTED ? `${line.slice(0, MAX_QUOTED - 1)}…` : line;
};

/**
 * LaTeX math: `$…$` and `\(…\)` inline, `$$…$$`, `\[…\]`, and ` ```math ` fences as display math. Each formula is
 * typeset once while parsing, as MathML by default, so renderers only draw it. It's named `math`, so it takes the
 * place of `comark/plugins/math`. A formula that can't be typeset renders its TeX, and a sentence about it is added to
 * `meta.issues`.
 */
export default defineComarkPlugin<MathOptions | undefined, MathMeta>((options = {}) => {
  const { output = "mathml", macros = {} } = options;
  return {
    name: "math",
    markdownItPlugins: [markdownIt],
    markdownItPost(state) {
      // Inspect nested tokens too: authored components can use any internal-looking name.
      const authoredTags = new Set<string>();
      const collectTags = (tokens: Token[]) => {
        for (const token of tokens) {
          authoredTags.add(token.tag);
          if (token.children) collectTags(token.children);
        }
      };
      collectTags(state.tokens);
      let tag: string;
      do {
        tag = `comark-mathml-${nextParse++}`;
      } while (authoredTags.has(tag));
      const formulas: { tex: string; display: boolean }[] = [];
      const visit = (tokens: Token[]) => {
        for (const token of tokens) {
          if (token.children) visit(token.children);
          const fence = token.type === "fence" && token.info.trim().split(/\s/)[0] === "math";
          if (!fence && token.type !== "math_inline" && token.type !== "math_block") continue;
          const index =
            formulas.push({
              tex: token.content.trim(),
              display: fence || token.type === "math_block",
            }) - 1;
          // This single-node token preserves our tag and attributes through Comark's tree builder.
          token.type = "mdc_block_shorthand";
          token.tag = tag;
          token.attrs = [["index", String(index)]];
        }
      };
      visit(state.tokens);
      generated.set(state, { tag, formulas });
    },
    async post(state) {
      const { tree } = state;
      const source = generated.get(state);
      if (!source) return;
      const found: { list: Node[]; index: number; tex: string; display: boolean }[] = [];
      const walk = (nodes: Node[], start: number) => {
        for (let index = start; index < nodes.length; index++) {
          const node = nodes[index];
          if (!node || !isElement(node)) continue;
          const [tag, attrs] = node;
          if (attrs.$?.html) continue;
          if (tag === source.tag) {
            const formula = source.formulas[Number(attrs.index)];
            if (formula) found.push({ list: nodes, index, ...formula });
            continue;
          }
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          walk(node as Node[], 2);
        }
      };
      walk(tree.nodes, 0);
      if (!found.length) return;

      const issues: Issue[] = [];
      const { typeset, missing } = await typesetter(output, macros);
      if (missing)
        issues.push({
          rule: "comark/math/katex-missing",
          message: `Math: \`output: "${output}"\` needs KaTeX, which isn't installed, so formulas render as MathML. Install \`katex\`, or drop the \`output\` option.`,
        });
      for (const { list, index, tex, display } of found) {
        const result = typeset(tex, display);
        const attrs: FormulaAttributes = display ? { tex, display } : { tex };
        if ("html" in result) attrs.html = result.html;
        else
          issues.push({
            rule: "comark/math/invalid-tex",
            message: `Math \`${quoted(tex)}\` failed to typeset: ${result.reason}. Fix the TeX or wrap it in code.`,
          });
        list[index] = ["formula", attrs];
      }
      if (!issues.length) return;
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
