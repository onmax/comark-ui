import { diffArrays } from "diff";
import { BENIGN, normalize, type Token } from "./normalize.ts";

export interface Difference {
  /** A short key that groups the same divergence across documents, such as `attr:a` or `missing:section`. */
  category: string;
  expected: string;
  actual: string;
  /** The open tags around the first divergence, outermost first. */
  path: string[];
}

export interface Comparison {
  equal: boolean;
  /** Tokens both sides share, over the average length of the two (the Dice coefficient), from 0 to 1. */
  score: number;
  differences: Difference[];
}

const tag = (token: Token | undefined) =>
  token ? (/^<\/?([\w-]+)/.exec(token)?.[1] ?? "text") : "end";
// Full text, capped so one runaway document can't bloat the report; display code centers on the change.
const show = (tokens: Token[]) =>
  tokens
    .map((token) => (token[0] === "#" || token[0] === "=" ? token.slice(1) : token))
    .join("")
    .slice(0, 4000);

function categorize(removed: Token[], added: Token[]): string {
  const [first] = removed;
  const [second] = added;
  // Only a lone open tag on each side is an attribute change; a hunk that also changes content is structural.
  if (
    removed.length === 1 &&
    added.length === 1 &&
    tag(first) === tag(second) &&
    first![0] === "<" &&
    first![1] !== "/"
  )
    return `attr:${tag(first)}`;
  if (first?.[0] === "#" && second?.[0] === "#") return "text";
  if (first?.[0] === "=" && second?.[0] === "=") return "code-text";
  if (!added.length) return `missing:${tag(first)}`;
  if (!removed.length) return `extra:${tag(second)}`;
  return `changed:${tag(first)}>${tag(second)}`;
}

/** The open tags at a position, read forward once: differences come in document order. */
function paths(tokens: Token[]) {
  const stack: string[] = [];
  let at = 0;
  return (end: number): string[] => {
    for (; at < end; at++) {
      const token = tokens[at]!;
      if (token.startsWith("</")) stack.pop();
      else if (token[0] === "<" && !VOID.test(token)) stack.push(tag(token));
    }
    return [...stack];
  };
}

const VOID = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/;

/** The token stream cut into its top-level elements, so a long document is diffed block by block first. */
function blocks(tokens: Token[]): Token[][] {
  const out: Token[][] = [];
  let current: Token[] = [];
  let depth = 0;
  for (const token of tokens) {
    current.push(token);
    if (token.startsWith("</")) depth--;
    else if (token[0] === "<" && !VOID.test(token)) depth++;
    if (depth <= 0) {
      out.push(current);
      current = [];
      depth = 0;
    }
  }
  if (current.length) out.push(current);
  return out;
}

/** Compares the HTML marked renders with Comark's, ignoring differences a reader can't see. */
export function compare(
  expectedHtml: string,
  actualHtml: string,
  options: { benign?: Set<string>; tokens?: boolean } = {},
): Comparison {
  const seen = new Set<string>();
  const expected = normalize(expectedHtml, { seen, codeNewline: true });
  // A trailing newline in `<pre><code>` never shows; marked writes one after every code block, Comark doesn't.
  const actual = normalize(actualHtml, {
    benign: options.benign ?? BENIGN,
    keep: seen,
    codeNewline: true,
  });
  const differences: Difference[] = [];
  let kept = 0;
  let position = 0;
  const pathAt = paths(expected);
  // Whole blocks first, then tokens inside the runs of blocks that changed: one token-level diff over a long
  // changelog with thousands of differences takes minutes.
  // `tokens` diffs the whole document token by token, for a score that block alignment can't skew.
  const left = options.tokens ? [expected] : blocks(expected);
  const right = options.tokens ? [actual] : blocks(actual);
  const outer = diffArrays(
    left.map((block) => block.join("\u0000")),
    right.map((block) => block.join("\u0000")),
  );
  let li = 0;
  let ri = 0;
  for (let index = 0; index < outer.length; index++) {
    const change = outer[index]!;
    const count = change.count ?? change.value.length;
    if (!change.added && !change.removed) {
      for (const block of left.slice(li, li + count)) {
        kept += block.length;
        position += block.length;
      }
      li += count;
      ri += count;
      continue;
    }
    let removedBlocks = 0;
    let addedBlocks = 0;
    if (change.removed) removedBlocks = count;
    else addedBlocks = count;
    const next = outer[index + 1];
    if (change.removed && next?.added) {
      addedBlocks = next.count ?? next.value.length;
      index++;
    }
    const from = left.slice(li, li + removedBlocks).flat();
    const to = right.slice(ri, ri + addedBlocks).flat();
    li += removedBlocks;
    ri += addedBlocks;
    const changes = diffArrays(from, to);
    for (let inner = 0; inner < changes.length; inner++) {
      const piece = changes[inner]!;
      if (!piece.added && !piece.removed) {
        kept += piece.count ?? piece.value.length;
        position += piece.value.length;
        continue;
      }
      const removed = piece.removed ? piece.value : [];
      const after = changes[inner + 1];
      const added = piece.added
        ? piece.value
        : after?.added && piece.removed
          ? (inner++, after.value)
          : [];
      differences.push({
        category: categorize(removed, added),
        expected: show(removed),
        actual: show(added),
        path: pathAt(position),
      });
      position += removed.length;
    }
  }
  const total = expected.length + actual.length;
  return { equal: !differences.length, score: total ? (2 * kept) / total : 1, differences };
}
