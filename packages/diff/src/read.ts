import type { ElementNode, Node } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";

export interface DiffRow {
  kind: "same" | "del" | "add";
  /** Line numbers in the file before and after, when the diff sets `line`. */
  old?: number;
  new?: number;
  /** The line's content: Shiki's token spans when the code is highlighted, with changed words in `del` or `ins`. */
  nodes: Node[];
  /** Whether its block highlights the line, as in ```ts {2}. */
  highlight: boolean;
}

export interface Diff {
  file: string;
  label?: string;
  line?: number;
  rows: DiffRow[];
  /** The first code block's `class` and `style`, which carry Shiki's theme. */
  code: { class?: string; style?: string };
}

/** What `:bound` props resolve against: the renderer's `state.renderData`, or the parsed document. */
export type Data = Parameters<typeof resolveAttributes>[1];

/** One problem: the comark-linter rule it falls under, and the sentence that names its block and the fix. */
export type Issue = { rule: `comark/diff/${string}`; message: string };

// What `check` calls each diff in its messages. The renderer reports nothing, so it needs no names.
type Names = Map<ElementNode, string>;

// Comark text nodes are strings, elements are arrays, and comments are arrays with a null tag.
const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const children = ([, , ...rest]: ElementNode): Node[] => rest;
// Prop values arrive as strings, numbers, or booleans; objects and arrays aren't valid for any prop here.
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
// Inline, YAML-block, and `:bound` props all land here, parsed the way Comark's own renderers see them.
const props = (node: ElementNode, data: Data) =>
  resolveAttributes(node[1], data, { parseJson: true });
// A `:bound` prop that resolved to nothing. The required-prop checks skip it, and `checkProps` reports it unless it
// reads render-time data.
const unresolved = (node: ElementNode, attrs: Record<string, unknown>, key: string) =>
  attrs[key] === undefined && Object.hasOwn(node[1], `:${key}`);
// Only the renderer's `data` and the parent's `props` are unknown while parsing; frontmatter and meta are already here.
const later = (path: string) => /^(?:data|props)(?:\.|$)/.test(path);
// Quotes what an author wrote, so a quote inside it can't blur where the name ends.
const quote = (value: string) => JSON.stringify(value);

const PROPS = ["file", "line", "label"] as const;
// Comark's own attributes, which a host may style or test by, so they aren't reported.
const NATIVE = /^(?:id|class|style|data-.+|aria-.+)$/i;
// Names an author is likely to guess, and what to write instead.
const HINTS = new Map([
  ["title", "Did you mean `label`?"],
  ["filename", "Did you mean `file`?"],
  ["start", "Did you mean `line`?"],
  ["lang", "Set the language on both code blocks, like ```ts."],
  ["language", "Set the language on both code blocks, like ```ts."],
]);

function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        row[j]! + 1,
        next[j - 1]! + 1,
        row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length]!;
}

// Unknown props are dropped, and broken bindings would render at 0 or empty, so both are reported. None of the props is
// a URL, so Comark never drops one as unsafe.
function checkProps(node: ElementNode, attrs: Record<string, unknown>, problems: Issue[]) {
  const valid: readonly string[] = PROPS;
  // The raw keys, since resolving drops some: a bound `__proto__` would set the result's prototype instead.
  const keys = new Set(Object.keys(node[1]).map((key) => key.replace(/^:/, "")));
  keys.delete("$");
  for (const key of keys) {
    if (NATIVE.test(key)) continue;
    if (valid.includes(key)) {
      const path = text(node[1][`:${key}`]);
      if (unresolved(node, attrs, key) && !later(path))
        problems.push({
          rule: "comark/diff/undefined-binding",
          message: `\`:${key}\` points at ${path}, which is undefined. Fix the path or set \`${key}\` directly.`,
        });
      continue;
    }
    const lower = key.toLowerCase();
    const close = valid.find(
      (name) => lower.length >= 3 && distance(lower, name) <= (lower.length >= 5 ? 2 : 1),
    );
    const hint = HINTS.get(lower) ?? (close ? `Did you mean \`${close}\`?` : "");
    problems.push({
      rule: "comark/diff/unknown-prop",
      message: `\`${key}\` isn't a prop of \`::diff\`.${hint ? ` ${hint}` : ""} Valid props: ${valid.join(", ")}.`,
    });
  }
}

// A suggested change is a few lines around the edit; past this it stops being reviewable.
export const MAX_DIFF_LINES = 200;
// Line matching and every word pair share this budget; after it runs out, changes stay whole lines.
const MAX_CELLS = 4_000_000;
type Budget = { cells: number };

type Step = ["same", number, number] | ["del", number] | ["add", number];

// The longest common subsequence of two lists, as the steps that turn `a` into `b`; a run of changes lists its
// removals before its additions.
function lcs(a: readonly string[], b: readonly string[], budget: Budget): Step[] {
  const steps: Step[] = [];
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    steps.push(["same", start, start]);
    start++;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const countA = endA - start;
  const countB = endB - start;
  const cells = countA * countB;
  if (!cells || cells > budget.cells) {
    if (cells > budget.cells) budget.cells = 0;
    for (let i = start; i < endA; i++) steps.push(["del", i]);
    for (let j = start; j < endB; j++) steps.push(["add", j]);
  } else {
    budget.cells -= cells;
    const width = countB + 1;
    const table = new Uint32Array((countA + 1) * width);
    for (let i = countA - 1; i >= 0; i--)
      for (let j = countB - 1; j >= 0; j--)
        table[i * width + j] =
          a[start + i] === b[start + j]
            ? table[(i + 1) * width + j + 1]! + 1
            : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
    let i = 0;
    let j = 0;
    while (i < countA || j < countB) {
      if (i < countA && j < countB && a[start + i] === b[start + j])
        steps.push(["same", start + i++, start + j++]);
      else if (
        j >= countB ||
        (i < countA && table[(i + 1) * width + j]! >= table[i * width + j + 1]!)
      )
        steps.push(["del", start + i++]);
      else steps.push(["add", start + j++]);
    }
  }
  for (let i = endA, j = endB; i < a.length; i++, j++) steps.push(["same", i, j]);
  return steps;
}

const lineText = (nodes: Node[]) => textContent(["span", {}, ...nodes]);

// Shiki wraps each line in a `span.line` and puts a newline between them; plain code is one string. Both come out as
// one list of nodes per line.
function lines(pre: ElementNode): Node[][] {
  const code = children(pre).find(isElement);
  const result: Node[][] = [[]];
  const add = (nodes: Node[]) => {
    for (const node of nodes) {
      if (!Array.isArray(node)) {
        const [first, ...rest] = node.split("\n");
        if (first) result.at(-1)!.push(first);
        for (const part of rest) result.push(part ? [part] : []);
      } else if (
        isElement(node) &&
        node[0] === "span" &&
        /(?:^|\s)line(?:\s|$)/.test(text(node[1].class))
      )
        add(children(node));
      else if (isElement(node)) result.at(-1)!.push(node);
    }
  };
  add(code && code[0] === "code" ? children(code) : children(pre));
  // A newline at the end leaves an empty line after it, which the code block doesn't show either.
  if (result.length > 1 && !lineText(result.at(-1)!)) result.pop();
  // An empty fence still parses as one empty line.
  return result.length === 1 && !lineText(result[0]!) ? [] : result;
}

// The block's highlighted lines, counted from 1. Comark keeps them on the block with or without Shiki.
const highlights = (pre?: ElementNode) => {
  const value: unknown = pre?.[1].highlights;
  return new Set<unknown>(Array.isArray(value) ? value : []);
};

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });
// Comark prints a `&` in text as it is, so `&lt;` in code reaches the browser as a character reference.
const REFERENCE = /(&(?:[a-z][\da-z]*|#\d+|#x[\da-f]+);)/i;

// Words, runs of spaces, and single symbols, so a changed name is marked whole and a changed bracket alone. Each piece
// is made of whole graphemes and a reference is one symbol, so a mark never splits an emoji, an accent from its
// letter, or a reference into the letters of its name.
function words(line: string) {
  const tokens: string[] = [];
  let last = "";
  for (const [index, part] of line.split(REFERENCE).entries()) {
    if (index % 2) {
      tokens.push(part);
      last = "";
      continue;
    }
    for (const { segment } of graphemes.segment(part)) {
      const kind = /^[\p{L}\p{N}_]/u.test(segment) ? "word" : /^\s/u.test(segment) ? "space" : "";
      if (kind && kind === last) tokens[tokens.length - 1] += segment;
      else tokens.push(segment);
      last = kind;
    }
  }
  return tokens;
}

// The character ranges of a line that the other line doesn't share, joined across the spaces between them.
function changed(steps: Step[], tokens: string[], side: "del" | "add") {
  const ranges: [number, number][] = [];
  let at = 0;
  // Whether only spaces lie between `at` and the end of the last range.
  let joined = false;
  for (const step of steps) {
    if (step[0] !== "same" && step[0] !== side) continue;
    const token = tokens[step[0] === "same" && side === "add" ? step[2] : step[1]]!;
    if (step[0] === side) {
      const last = ranges.at(-1);
      if (last && joined) last[1] = at + token.length;
      else ranges.push([at, at + token.length]);
      joined = true;
    } else joined &&= !token.trim();
    at += token.length;
  }
  return ranges;
}

// Cuts the line's nodes at the ranges and wraps what falls inside in `tag`, inside Shiki's token spans so the colors stay.
function cut(nodes: Node[], ranges: [number, number][], tag: "del" | "ins", start = 0): Node[] {
  const result: Node[] = [];
  let at = start;
  for (const node of nodes) {
    const length = !Array.isArray(node)
      ? node.length
      : isElement(node)
        ? lineText([node]).length
        : 0;
    const inside = ranges.filter(([from, to]) => from < at + length && to > at);
    if (!inside.length) result.push(node);
    else if (!Array.isArray(node)) {
      let cursor = 0;
      for (const [from, to] of inside) {
        const a = Math.max(from - at, 0);
        const b = Math.min(to - at, length);
        if (a > cursor) result.push(node.slice(cursor, a));
        result.push([tag, {}, node.slice(a, b)]);
        cursor = b;
      }
      if (cursor < length) result.push(node.slice(cursor));
    } else if (isElement(node))
      result.push([node[0], node[1], ...cut(children(node), ranges, tag, at)]);
    else result.push(node);
    at += length;
  }
  return result;
}

// Marks the words that changed between a removed line and the added line paired with it, unless they share too
// little for the marks to help: then the whole line is the change.
function pair(before: DiffRow, after: DiffRow, budget: Budget) {
  if (!budget.cells) return;
  const a = words(lineText(before.nodes));
  const b = words(lineText(after.nodes));
  const steps = lcs(a, b, budget);
  if (!budget.cells) return;
  let shared = 0;
  for (const step of steps) if (step[0] === "same") shared += a[step[1]]!.length;
  const total = a.join("").length + b.join("").length;
  if (!total || (2 * shared) / total < 0.5) return;
  const removed = changed(steps, a, "del");
  const added = changed(steps, b, "add");
  if (removed.length) before.nodes = cut(before.nodes, removed, "del");
  if (added.length) after.nodes = cut(after.nodes, added, "ins");
}

const codeBlocks = (node: ElementNode) =>
  children(node).filter((child): child is ElementNode => isElement(child) && child[0] === "pre");
// The `file` prop wins over the blocks' own names, and the first block's over the second's.
const fileOf = (node: ElementNode, attrs: Record<string, unknown>) =>
  text(attrs.file) || text(codeBlocks(node)[0]?.[1].filename) || "";

function read(node: ElementNode, issues: Issue[], data: Data, names: Names = new Map()) {
  const attrs = props(node, data);
  const blocks = codeBlocks(node);
  const [first, second] = blocks;
  const filenames = [text(first?.[1].filename), text(second?.[1].filename)];
  const file = fileOf(node, attrs);
  const where = names.get(node) ?? (file ? `diff ${quote(file)}` : "diff");
  const problems: Issue[] = [];
  checkProps(node, attrs, problems);
  for (const child of children(node))
    if (!(isElement(child) && child[0] === "pre") && (isElement(child) || text(child)))
      problems.push({
        rule: "comark/diff/stray-content",
        message: `only two code blocks can go inside a diff (found ${isElement(child) && child[0] !== "p" ? `\`${child[0]}\`` : "text"}). Put explanations above or below it.`,
      });
  const language = (block?: ElementNode) => text(block?.[1].language);
  // Agents used to suggesting changes in review comments often paste a unified diff, which this would show as one
  // added or removed file and then report the wrong fix.
  const unified = blocks.some((block) => /^(?:diff|patch)$/i.test(language(block)));
  if (unified)
    problems.push({
      rule: "comark/diff/unified-diff",
      message:
        "a ```diff block is a unified diff, and `::diff` draws the diff itself. Write the old lines in the first block and the new lines in the second, each in the file's language, like ```ts.",
    });
  else if (blocks.length !== 2)
    problems.push({
      rule: "comark/diff/block-count",
      message: `needs exactly two code blocks, before and after (got ${blocks.length}). ${blocks.length < 2 ? "Add the missing one; leave it empty for a file that's added or deleted" : "Put the rest in another diff"}.`,
    });
  if (first && !file && !unresolved(node, attrs, "file"))
    problems.push({
      rule: "comark/diff/missing-file",
      message: `name the file in the first block (\`\`\`${language(first) || "ts"} [src/a.ts]) or with file="src/a.ts".`,
    });
  if (filenames[0] && filenames[1] && filenames[0] !== filenames[1])
    problems.push({
      rule: "comark/diff/file-mismatch",
      message: `the before block names ${quote(filenames[0])} and the after block ${quote(filenames[1])}. A diff shows one file; split the other into its own diff.`,
    });
  if (!unified && first && second && language(first) !== language(second)) {
    const is = (block: ElementNode) =>
      language(block) ? `is ${quote(language(block))}` : "has no language";
    problems.push({
      rule: "comark/diff/language-mismatch",
      message: `the before block ${is(first)} and the after block ${is(second)}. Give both the same language, like \`\`\`${language(first) || language(second)}.`,
    });
  }
  const raw = text(attrs.line);
  const line = /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : undefined;
  if (raw && !line)
    problems.push({
      rule: "comark/diff/invalid-line",
      message: `\`line\` must be the file's line number for the first line, a whole number from 1 (got ${quote(raw)}).`,
    });

  const old = first ? lines(first) : [];
  const next = second ? lines(second) : [];
  for (const [index, list] of [old, next].entries())
    if (list.length > MAX_DIFF_LINES)
      problems.push({
        rule: "comark/diff/too-many-lines",
        message: `the ${index ? "after" : "before"} block has ${list.length} lines. Keep only the lines around the change, at most ${MAX_DIFF_LINES}.`,
      });
  if (
    blocks.length === 2 &&
    old.length === next.length &&
    old.every((nodes, index) => lineText(nodes) === lineText(next[index]!))
  )
    problems.push({
      rule: "comark/diff/no-change",
      message:
        "before and after are the same, so there's no change to show. Edit the after block, or remove the diff.",
    });
  issues.push(...problems.map(({ rule, message }) => ({ rule, message: `${where}: ${message}` })));

  const code = first?.[1] ?? {};
  return {
    old,
    next,
    first,
    second,
    file,
    label: text(attrs.label) || undefined,
    line,
    code: { class: text(code.class) || undefined, style: text(code.style) || undefined },
  };
}

/** Reads a `::diff` node: two fenced code blocks, before and after, as the rows of a suggested change. */
export function readDiff(node: ElementNode, issues: Issue[], data: Data): Diff {
  const { old, next, first, second, ...diff } = read(node, issues, data);
  const { line } = diff;
  const budget: Budget = { cells: MAX_CELLS };
  const steps = lcs(old.map(lineText), next.map(lineText), budget);
  const rows: DiffRow[] = [];
  const at = (n: number) => (line === undefined ? undefined : line + n);
  const [litBefore, litAfter] = [highlights(first), highlights(second)];
  let removed: DiffRow[] = [];
  let added: DiffRow[] = [];
  const flush = () => {
    for (let k = 0; k < Math.min(removed.length, added.length); k++)
      pair(removed[k]!, added[k]!, budget);
    rows.push(...removed, ...added);
    removed = [];
    added = [];
  };
  for (const step of steps) {
    if (step[0] === "del")
      removed.push({
        kind: "del",
        old: at(step[1]),
        nodes: old[step[1]]!,
        highlight: litBefore.has(step[1] + 1),
      });
    else if (step[0] === "add")
      added.push({
        kind: "add",
        new: at(step[1]),
        nodes: next[step[1]]!,
        highlight: litAfter.has(step[1] + 1),
      });
    else {
      flush();
      rows.push({
        kind: "same",
        old: at(step[1]),
        new: at(step[2]),
        nodes: old[step[1]]!,
        highlight: litBefore.has(step[1] + 1) || litAfter.has(step[2] + 1),
      });
    }
  }
  flush();
  return { ...diff, rows };
}

// A diff is named by its file, the way a review names a suggestion, and by its position when that's not enough.
function name(nodes: Node[], data: Data): Names {
  const diffs: ElementNode[] = [];
  const walk = (list: Node[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (node[0] === "diff") diffs.push(node);
      else walk(children(node));
    }
  };
  walk(nodes);
  const names: Names = new Map();
  const files = diffs.map((node) => fileOf(node, props(node, data)));
  for (const [index, node] of diffs.entries()) {
    const file = files[index]!;
    names.set(
      node,
      file && files.indexOf(file) === files.lastIndexOf(file)
        ? `diff ${quote(file)}`
        : diffs.length === 1
          ? "diff"
          : `diff ${index + 1}${file ? ` (${quote(file)})` : ""}`,
    );
  }
  return names;
}

/** Every problem in a document's diffs, wherever they sit. */
export function check(nodes: Node[], data: Data): Issue[] {
  const issues: Issue[] = [];
  const names = name(nodes, data);
  const walk = (list: Node[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (node[0] === "diff") read(node, issues, data, names);
      else walk(children(node));
    }
  };
  walk(nodes);
  return issues;
}
