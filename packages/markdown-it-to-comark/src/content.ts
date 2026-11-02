import MarkdownIt from "markdown-it";
import type { Options, PresetName } from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";

/** A markdown-it plugin and the options it is registered with, as `md.use(plugin, ...options)` takes them. */
export type PluginUse = [plugin: unknown, ...options: unknown[]];

export interface ContentOptions {
  /** Whether the Comark side keeps component and attribute syntax; see `comarkSetup`. `plain` needs no escapes. */
  syntax?: "comark" | "plain";
  preset?: PresetName;
  /** markdown-it's options, which decide what it reads as text (`html`, `linkify`). */
  options?: Options;
  /** Rules turned on or off after the preset. */
  enable?: string[];
  disable?: string[];
  /**
   * The project's syntax plugins. What they parse (`::: tip`, `$x$`, `[^1]`) isn't text, so it's left for the same
   * plugin on the Comark side instead of being escaped.
   */
  plugins?: PluginUse[];
  /** Whether the project turns `:smile:` into emoji (markdown-it-emoji), so shortcodes stay as written. */
  emoji?: boolean;
  /** Whether the project reads `{.class}` attributes (markdown-it-attrs), so they stay for Comark's attributes. */
  attrs?: boolean;
  /** Whether the project renders `- [ ] task` checkboxes (markdown-it-task-lists), so their brackets stay. */
  tasks?: boolean;
  /** Other setups that may render the same documents: an edit is kept only when each of them renders it the same. */
  alternatives?: Omit<ContentOptions, "alternatives">[];
}

export interface ContentChange {
  /** 1-based line in the original source. */
  line: number;
  kind: "escape" | "reference";
  text: string;
}

export interface ContentResult {
  markdown: string;
  changes: ContentChange[];
  /** Lines of blocks left as written because no edit kept markdown-it's output; Comark may read them differently. */
  skipped: number[];
}

interface Edit {
  offset: number;
  insert: string;
  change: ContentChange;
}

/** What markdown-it's inline parser did with one inline token's text: each rule it matched, and each nested parse. */
interface Trace {
  src: string;
  spans: { start: number; end: number; name: string; depth: number }[];
  ranges: { start: number; end: number; depth: number }[];
  depth: number;
}

interface Instrumented {
  md: MarkdownIt;
  traces: WeakMap<Token, Trace>;
}

// A frontmatter block (`---`, `---js`, or `+++`), which sites strip before markdown-it sees the file.
const FRONTMATTER =
  /^(?:﻿)?(?:---[a-z]*[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---|\+\+\+[ \t]*\r?\n(?:[\s\S]*?\r?\n)?\+\+\+)[ \t]*(?:\r?\n|$)/;

const instances = new WeakMap<object, Instrumented>();

/** A markdown-it configured like the project, whose inline rules record what they match. */
function instrumented(options: ContentOptions): Instrumented {
  const cached = instances.get(options);
  if (cached) return cached;
  const md = new MarkdownIt(options.preset ?? "default", options.options ?? {});
  if (options.enable?.length) md.enable(options.enable, true);
  if (options.disable?.length) md.disable(options.disable, true);
  // SAFETY: a markdown-it plugin takes the instance and its options.
  for (const [plugin, ...rest] of options.plugins ?? []) md.use(plugin as never, ...(rest as []));
  const traces = new WeakMap<Token[], Trace>();
  const stack: Trace[] = [];
  const ruler = md.inline.ruler as unknown as {
    __rules__: { name: string; fn: (state: StateInline, silent: boolean) => boolean }[];
    __cache__: unknown;
  };
  for (const rule of ruler.__rules__) {
    const fn = rule.fn;
    const name = rule.name;
    rule.fn = (state, silent) => {
      const start = state.pos;
      const matched = fn(state, silent);
      const trace = stack.at(-1);
      if (matched && !silent && trace && trace.src === state.src)
        trace.spans.push({ start, end: state.pos, name, depth: trace.depth });
      return matched;
    };
  }
  ruler.__cache__ = null;
  const tokenize = md.inline.tokenize.bind(md.inline);
  md.inline.tokenize = (state) => {
    const trace = stack.at(-1);
    if (!trace || trace.src !== state.src) return tokenize(state);
    trace.depth++;
    trace.ranges.push({ start: state.pos, end: state.posMax, depth: trace.depth });
    tokenize(state);
    trace.depth--;
  };
  const parse = md.inline.parse.bind(md.inline);
  md.inline.parse = (src, mdInstance, env, tokens) => {
    const trace: Trace = { src, spans: [], ranges: [], depth: 0 };
    // An image's alt text is parsed on its own; it has no place in the block's text, so it isn't traced.
    if (!stack.length) traces.set(tokens, trace);
    stack.push(trace);
    try {
      parse(src, mdInstance, env, tokens);
    } finally {
      stack.pop();
    }
  };
  // Plugins' core rules (emoji, task lists) may replace an inline token's children after parsing; the trace is
  // moved onto the token itself first.
  const byToken = new WeakMap<Token, Trace>();
  md.core.ruler.after("inline", "markdown-it-to-comark-trace", (state) => {
    for (const token of state.tokens) {
      const trace = token.children && traces.get(token.children);
      if (trace) byToken.set(token, trace);
    }
  });
  const result = { md, traces: byToken };
  instances.set(options, result);
  return result;
}

/** A markdown-it configured like the project, as `migrateContent` reads with it. */
export const markdownItFor = (options: ContentOptions): MarkdownIt => instrumented(options).md;

/** For each offset of an inline token's text, whether markdown-it read it as plain text, and inside a link's label. */
function literal(trace: Trace): { text: boolean[]; label: boolean[] } {
  const text = Array.from<boolean>({ length: trace.src.length }).fill(false);
  const label = Array.from<boolean>({ length: trace.src.length }).fill(false);
  const depths = new Set(trace.ranges.map((range) => range.depth));
  for (const depth of [...depths].sort((a, b) => a - b)) {
    for (const range of trace.ranges)
      if (range.depth === depth)
        for (let offset = range.start; offset < range.end; offset++) {
          text[offset] = true;
          label[offset] = depth > 1;
        }
    for (const span of trace.spans)
      if (span.depth === depth && span.name !== "text")
        for (let offset = span.start; offset < span.end; offset++) text[offset] = false;
  }
  return { text, label };
}

interface Line {
  start: number;
  text: string;
}

/** The source's lines as markdown-it counts them (`\r\n`, `\r`, and `\n` all end one), with their offsets. */
function lines(source: string, from: number): Line[] {
  const out: Line[] = [];
  const pattern = /\r\n?|\n/g;
  let start = from;
  pattern.lastIndex = from;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    out.push({ start, text: source.slice(start, match.index) });
    start = match.index + match[0].length;
  }
  out.push({ start, text: source.slice(start) });
  return out;
}

/**
 * Where each character of an inline token's text is in the source, plus one past the end. markdown-it strips each
 * line's indentation and container markers (`> `, list indent) and trims the block, so a line of text is the end of
 * its source line, or for a table cell or a heading with closing `#`s, found after the previous match on that line. A
 * table cell's `|` may be written `\|`. `undefined` when a line can't be found as written (a tab expanded to spaces).
 */
function locate(
  content: string,
  map: [number, number],
  source: Line[],
  cursors: Map<number, number>,
): number[] | undefined {
  const offsets: number[] = [];
  const parts = content.split("\n");
  for (const [index, part] of parts.entries()) {
    const number = map[0] + index;
    const line = source[number];
    if (!line || number >= map[1]) return undefined;
    const cursor = cursors.get(number) ?? 0;
    // Each character's place in the line when the part starts at `at`, or undefined if it doesn't match there.
    const match = (at: number): number[] | undefined => {
      const found: number[] = [];
      let column = at;
      for (const char of part) {
        if (line.text[column] === "\\" && line.text[column + 1] === "|" && char === "|") column++;
        if (line.text[column] !== char) return undefined;
        found.push(line.start + column++);
      }
      found.push(line.start + column);
      return found;
    };
    const trimmed = line.text.trimEnd();
    const wanted = part.trimEnd();
    let found =
      trimmed.endsWith(wanted) && trimmed.length - wanted.length >= cursor
        ? match(trimmed.length - wanted.length)
        : undefined;
    for (let at = cursor; !found && at <= line.text.length - part.length; at++)
      if (line.text[at] === part[0] || (part[0] === "|" && line.text[at] === "\\")) found = match(at);
    if (!found) {
      // A line that can't be found would let the next cell on it match inside this one.
      cursors.set(number, Number.POSITIVE_INFINITY);
      return undefined;
    }
    cursors.set(number, found.at(-1)! - line.start);
    // One past a line's end is where the newline after it sits in the text.
    offsets.push(...found);
  }
  return offsets;
}

/**
 * Characters Comark reads as syntax where markdown-it reads text: `{` opens attributes, `[` a span, and `:` before a
 * letter a component (`:smile:`, `::note`). Escaping them is a no-op for markdown-it, since a backslash before ASCII
 * punctuation is plain CommonMark.
 */
function escapes(
  src: string,
  text: boolean[],
  label: boolean[],
  options: ContentOptions,
): { offset: number; char: string }[] {
  const found: { offset: number; char: string }[] = [];
  let open = 0;
  // A task's checkbox, which the project's plugin reads after parsing and `markdownItPlugin()` keeps from Comark's span.
  const checkbox = options.tasks && /^\[[ xX]\][ \t]/.test(src) ? 3 : 0;
  for (let offset = checkbox; offset < src.length; offset++) {
    if (!text[offset]) continue;
    const char = src[offset]!;
    const before = src[offset - 1] ?? "\n";
    let escape = false;
    if (char === "{") escape = !options.attrs && before !== "{" && src[offset + 1] !== "{";
    else if (char === "[") {
      // Comark reads `[` as a span even with no `]`: the span then runs to the end of the paragraph.
      escape = true;
      open++;
    } else if (char === "]") {
      escape = open > 0 || Boolean(label[offset]);
      if (open > 0) open--;
    } else if (char === ":") {
      escape = /[A-Za-z$]/.test(src[offset + 1] ?? "") && !/[A-Za-z0-9]/.test(before);
      // `::: info` at the start of a line: Comark reads a block component even with a space before the name.
      let run = offset;
      while (src[run - 1] === ":") run--;
      if (
        (run === 0 || src[run - 1] === "\n") &&
        /^:{2,}[ \t]+[A-Za-z$]/.test(src.slice(run, run + 80))
      )
        escape = true;
      // A shortcode's opening colon, or its closing one, when the project renders them as emoji.
      if (
        escape &&
        options.emoji &&
        (/^:[\w+-]+:/.test(src.slice(offset)) || /:[\w+-]+$/.test(src.slice(0, offset)))
      )
        escape = false;
    }
    if (escape) found.push({ offset, char });
  }
  return found;
}

/** A link written as a shortcut reference, `[label]`, which Comark reads as a span; `[label][]` is the same link. */
const isShortcut = (text: string) =>
  text.startsWith("[") && text.endsWith("]") && !/\]\s*\[[^\]]*\]$/.test(text);

const lineOf = (source: Line[], offset: number) => {
  let low = 0;
  let high = source.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (source[middle]!.start <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
};

function apply(source: string, edits: Edit[]): string {
  const ordered = [...edits].sort((a, b) => a.offset - b.offset);
  const parts: string[] = [];
  let cursor = 0;
  for (const edit of ordered) {
    parts.push(source.slice(cursor, edit.offset), edit.insert);
    cursor = edit.offset;
  }
  parts.push(source.slice(cursor));
  return parts.join("");
}

/**
 * Rewrites Markdown written for markdown-it so Comark reads it the same way, and lists every change by line. Only
 * text markdown-it read as text is touched, and every edit is checked: markdown-it renders the result byte for byte
 * as before, or the block's edits are dropped and its line is reported. Code, HTML, and frontmatter stay as written.
 */
export function migrateContent(source: string, options: ContentOptions = {}): ContentResult {
  if ((options.syntax ?? "comark") !== "comark")
    return { markdown: source, changes: [], skipped: [] };
  const { md, traces } = instrumented(options);
  const bodyStart = FRONTMATTER.exec(source)?.[0].length ?? 0;
  const body = source.slice(bodyStart);
  const source_ = lines(source, bodyStart);
  const tokens = md.parse(body, {});
  // Edits grouped by the block they belong to, so a block whose edits change markdown-it's output can be left alone.
  const blocks: { line: number; edits: Edit[] }[] = [];
  const cursors = new Map<number, number>();
  const unmapped: number[] = [];
  // Table cells have no line map of their own; their row's is the line they're on.
  let lastMap: [number, number] | undefined;
  for (const token of tokens) {
    if (token.type !== "inline" && token.map) lastMap = token.map as [number, number];
    const map =
      (token.map as [number, number] | null) ?? (token.type === "inline" ? lastMap : undefined);
    if (token.type !== "inline" || !map || !token.children) continue;
    const trace = traces.get(token);
    // The text as parsed: plugins (task lists) may trim `token.content` afterwards.
    if (!trace) continue;
    const { text, label } = literal(trace);
    const found = escapes(trace.src, text, label, options);
    const shortcuts = trace.spans.filter(
      (span) => span.name === "link" && isShortcut(trace.src.slice(span.start, span.end)),
    );
    const positions = locate(trace.src, map, source_, cursors);
    if (!found.length && !shortcuts.length) continue;
    if (!positions) {
      unmapped.push(lineOf(source_, source_[map[0]]?.start ?? 0));
      continue;
    }
    const at = (offset: number) => positions[offset]!;
    const edits: Edit[] = found.map(({ offset, char }) => {
      const position = at(offset);
      return {
        offset: position,
        insert: "\\",
        change: { line: lineOf(source_, position), kind: "escape", text: char },
      };
    });
    for (const span of shortcuts) {
      const position = at(span.end);
      edits.push({
        offset: position,
        insert: "[]",
        change: { line: lineOf(source_, position), kind: "reference", text: "[]" },
      });
    }
    blocks.push({ line: lineOf(source_, positions[0]!), edits });
  }
  if (!blocks.length) return { markdown: source, changes: [], skipped: unmapped };
  // Every kept edit is proven: markdown-it renders the edited document exactly as the original. When the whole set
  // doesn't, the blocks are split in halves until the ones that change the output are found and left as written.
  const renderers = [md, ...(options.alternatives ?? []).map((other) => instrumented(other).md)];
  const expected = renderers.map((renderer) => renderer.render(body, {}));
  const renders = (kept: typeof blocks) => {
    const edited = apply(
      source,
      kept.flatMap((block) => block.edits),
    ).slice(bodyStart);
    return renderers.every((renderer, index) => renderer.render(edited, {}) === expected[index]);
  };
  const kept: typeof blocks = [];
  const skipped: number[] = [...unmapped];
  const search = (group: typeof blocks) => {
    if (renders([...kept, ...group])) {
      kept.push(...group);
      return;
    }
    if (group.length === 1) {
      // A plugin that reads text after parsing (markdown-it-attrs' `{.x}`, markdown-it-emoji's `:name:`) breaks when
      // one kind of character is escaped; the block keeps its other edits.
      const block = group[0]!;
      for (const kind of [["{"], [":"], ["[", "]", "[]"]]) {
        const edits = block.edits.filter((edit) => !kind.includes(edit.change.text));
        if (edits.length === block.edits.length || !edits.length) continue;
        if (renders([...kept, { ...block, edits }])) {
          kept.push({ ...block, edits });
          return;
        }
      }
      skipped.push(block.line);
      return;
    }
    const half = Math.ceil(group.length / 2);
    search(group.slice(0, half));
    search(group.slice(half));
  };
  search(blocks);
  const edits = kept.flatMap((block) => block.edits).sort((a, b) => a.offset - b.offset);
  return {
    markdown: apply(source, edits),
    changes: edits.map((edit) => edit.change),
    skipped: [...new Set(skipped)].sort((a, b) => a - b),
  };
}
