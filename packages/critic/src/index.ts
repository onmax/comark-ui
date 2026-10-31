import { defineComarkPlugin } from "comark";
import {
  addRule,
  SPAN,
  stable,
  type StateInline,
  type Token,
} from "../../../shared/markdown-it.ts";

export type CriticMode = "view" | "accept" | "reject";

export type CriticMeta = {
  /** One readable sentence per problem with a CriticMarkup mark. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/critic/${string}`; message: string };

export interface CriticOptions {
  /**
   * `view` shows every change: insertions as `<ins>`, deletions as `<del>`, highlights as `<mark>`, and comments as
   * `<span class="ccm-comment">`. `accept` renders the document with the changes made, and `reject` without them.
   * Default `view`.
   */
  mode?: CriticMode;
}

const COMMENT_CLASS = "ccm-comment";
// Insertions, deletions, and highlights are native tags with a class, so `css` styles them and not a page's other
// `<del>`, which Comark also writes for `~~strikethrough~~`.
const CLASSES = { ins: "ccm-ins", del: "ccm-del", mark: "ccm-mark" } as const;

export { css } from "./styles.ts";

type Kind = "ins" | "del" | "sub" | "mark" | "comment";
const MARKS = new Map<string, { kind: Kind; close: string }>([
  ["{++", { kind: "ins", close: "++}" }],
  ["{--", { kind: "del", close: "--}" }],
  ["{~~", { kind: "sub", close: "~~}" }],
  ["{==", { kind: "mark", close: "==}" }],
  ["{>>", { kind: "comment", close: "<<}" }],
]);
const MODES = new Set<string>(["view", "accept", "reject"]);
// A mark the rule couldn't read. Comark skips inline tokens it doesn't know, and markdownItPost removes these anyway.
const PROBLEM = "critic_problem";

/** Tokenizes `from` to `to` as inline Markdown, inside `tag` unless it's empty. */
function inline(state: StateInline, from: number, to: number, tag = "", className = "") {
  const max = state.posMax;
  if (tag) {
    const open = state.push(`${SPAN}_open`, tag, 1);
    if (className) open.attrs = [["class", className]];
  }
  state.pos = from;
  state.posMax = to;
  state.md.inline.tokenize(state);
  state.posMax = max;
  if (tag) state.push(`${SPAN}_close`, tag, -1).meta = { critic: className };
}

function problem(state: StateInline, opener: string, { rule, message }: Issue) {
  const token = state.push(PROBLEM, "", 0);
  token.content = message;
  token.meta = { rule };
  // The opener stays as written, and what follows it parses as usual.
  state.pending += opener;
  state.pos += opener.length;
  return true;
}

/** Finds a delimiter in inline source while skipping escaped text and code spans. */
function delimiter(src: string, from: number, max: number, needle: string) {
  for (let index = from; index <= max - needle.length; index++) {
    if (src.charCodeAt(index) === 0x5c) {
      index++;
      continue;
    }
    if (src.charCodeAt(index) === 0x60) {
      let end = index + 1;
      while (src.charCodeAt(end) === 0x60) end++;
      const ticks = src.slice(index, end);
      const close = src.indexOf(ticks, end);
      if (close >= 0 && close < max) {
        index = close + ticks.length - 1;
        continue;
      }
    }
    // Markdown links and autolinks consume delimiter-looking text as part of their syntax. A comment's `<<}` is never
    // an autolink's start.
    if (src[index] === "<" && !src.startsWith(needle, index)) {
      let quote = "";
      let close = -1;
      for (let cursor = index + 1; cursor < max; cursor++) {
        const char = src[cursor];
        if (quote) {
          if (char === "\\") cursor++;
          else if (char === quote) quote = "";
        } else if (char === '"' || char === "'") quote = char;
        else if (char === ">") {
          close = cursor;
          break;
        }
      }
      if (close >= 0) {
        index = close;
        continue;
      }
    }
    if (src[index] === "[") {
      let label = -1;
      let depth = 1;
      for (let cursor = index + 1; cursor < max; cursor++) {
        if (src[cursor] === "\\") cursor++;
        else if (src[cursor] === "[") depth++;
        else if (src[cursor] === "]" && --depth === 0) {
          label = cursor;
          break;
        }
      }
      if (label >= 0 && label + 1 < max && src[label + 1] === "(") {
        let depth = 1;
        let close = label + 2;
        for (; close < max && depth; close++) {
          if (src[close] === "\\") close++;
          else if (src[close] === "(") depth++;
          else if (src[close] === ")") depth--;
        }
        if (!depth) {
          index = close - 1;
          continue;
        }
      }
    }
    // Skip a paired emphasis run, whose contents are parsed as one Markdown construct.
    if (src[index] === "*" || src[index] === "_") {
      const marker = src[index];
      let run = index + 1;
      while (src[run] === marker) run++;
      const close = src.indexOf(src.slice(index, run), run);
      if (close >= 0 && close < max) {
        index = close + (run - index) - 1;
        continue;
      }
    }
    if (src.startsWith(needle, index)) return index;
  }
  return -1;
}

const rule = (mode: CriticMode) => (state: StateInline, silent: boolean) => {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== 0x7b) return false;
  const opener = state.src.slice(start, start + 3);
  const mark = MARKS.get(opener);
  if (!mark) return false;
  const from = start + 3;
  const to = delimiter(state.src, from, state.posMax, mark.close);
  if (to < 0 || to + 3 > state.posMax) {
    if (silent) return false;
    return problem(state, opener, {
      rule: "comark/critic/unclosed-mark",
      message: `critic \`${opener}\` has no closing \`${mark.close}\` in its paragraph; close it there, or write \`\\${opener}\` to keep the text.`,
    });
  }
  const arrow = mark.kind === "sub" ? delimiter(state.src, from, to, "~>") : -1;
  if (mark.kind === "sub" && (arrow < 0 || arrow > to)) {
    if (silent) return false;
    return problem(state, opener, {
      rule: "comark/critic/missing-arrow",
      message: `critic \`{~~${state.src.slice(from, to)}~~}\` has no \`~>\` between the old and the new text; write \`{~~old~>new~~}\`.`,
    });
  }
  if (silent) {
    state.pos = to + 3;
    return true;
  }

  const view = mode === "view";
  if (mark.kind === "sub") {
    if (mode !== "accept") inline(state, from, arrow, view ? "del" : "", CLASSES.del);
    if (mode !== "reject") inline(state, arrow + 2, to, view ? "ins" : "", CLASSES.ins);
  } else if (mark.kind === "comment") {
    if (view) inline(state, from, to, "span", COMMENT_CLASS);
  } else if (mark.kind === "mark") {
    inline(state, from, to, view ? "mark" : "", CLASSES.mark);
  } else if (view) {
    inline(state, from, to, mark.kind, CLASSES[mark.kind]);
  } else if ((mark.kind === "ins") === (mode === "accept")) {
    inline(state, from, to);
  }
  state.pos = to + 3;
  return true;
};

// One markdown-it function per mode, so every parse with the same mode reuses Comark's cached parser. The rule runs
// before Comark's attribute rule, which would otherwise read `{++add++}` as attributes and drop it.
const markdownIt = stable((mode: CriticMode) => (md) => {
  addRule(md.inline.ruler, "before", ["comark_inline_props", "entity"], "critic", rule(mode));
});

const problems = new WeakMap<object, Issue[]>();

function collect(tokens: Token[], found: Issue[]) {
  for (let index = tokens.length - 1; index >= 0; index--) {
    const token = tokens[index];
    if (!token) continue;
    if (token.children) collect(token.children, found);
    // Comark sets the class of `{.class}` after a mark in place of the mark's own, so the props carry both.
    if (token.type === "mdc_inline_props" && token.attrGet("class")) {
      let before = index - 1;
      while (tokens[before]?.type === "text" && !tokens[before]!.content.trim()) before--;
      // SAFETY: only the close token created by `inline` carries this metadata shape.
      const own = (tokens[before]?.meta as { critic?: string } | null)?.critic;
      if (own) token.attrSet("class", `${own} ${token.attrGet("class")}`);
    }
    if (token.type !== PROBLEM) continue;
    // SAFETY: `problem()` gives every PROBLEM token its rule in `meta`.
    found.unshift({ rule: (token.meta as Pick<Issue, "rule">).rule, message: token.content });
    tokens.splice(index, 1);
  }
}

/**
 * CriticMarkup: `{++inserted++}`, `{--deleted--}`, `{~~old~>new~~}`, `{==highlighted==}`, and `{>>comments<<}`, each
 * inside one paragraph. `mode` shows the changes, or renders the document with them accepted or rejected.
 */
export default defineComarkPlugin<CriticOptions, CriticMeta>((options) => {
  const asked = options?.mode ?? "view";
  const mode: CriticMode = MODES.has(asked) ? asked : "view";
  return {
    name: "comark-critic",
    markdownItPlugins: [markdownIt(mode)],
    markdownItPost(state) {
      const found: Issue[] = [];
      collect(state.tokens, found);
      problems.set(state, found);
    },
    post(state) {
      const found = problems.get(state) ?? [];
      if (mode !== asked)
        found.unshift({
          rule: "comark/critic/invalid-mode",
          message: `critic: \`mode\` must be "view", "accept", or "reject", not "${String(asked)}"; until then it shows the changes.`,
        });
      if (!found.length) return;
      const { meta } = state.tree;
      meta.issues = [...(meta.issues ?? []), ...found.map((issue) => issue.message)];
      meta.issueRules = {
        ...meta.issueRules,
        ...Object.fromEntries(found.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
