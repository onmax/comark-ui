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

function pathAt(tokens: Token[], end: number): string[] {
  const stack: string[] = [];
  for (const token of tokens.slice(0, end)) {
    if (token.startsWith("</")) stack.pop();
    else if (
      token[0] === "<" &&
      !/^<(br|hr|img|input|wbr|meta|link|source|col|area|embed|track|base)\b/.test(token)
    )
      stack.push(tag(token));
  }
  return stack;
}

/** Compares the HTML a remark pipeline renders with Comark's, ignoring differences a reader can't see. */
export function compare(
  expectedHtml: string,
  actualHtml: string,
  options: { benign?: Set<string> } = {},
): Comparison {
  const seen = new Set<string>();
  const expected = normalize(expectedHtml, { seen, codeNewline: true });
  const actual = normalize(actualHtml, { benign: options.benign ?? BENIGN, keep: seen });
  const changes = diffArrays(expected, actual);
  const differences: Difference[] = [];
  let kept = 0;
  let position = 0;
  for (let index = 0; index < changes.length; index++) {
    const change = changes[index]!;
    if (!change.added && !change.removed) {
      kept += change.count ?? change.value.length;
      position += change.value.length;
      continue;
    }
    const removed = change.removed ? change.value : [];
    const next = changes[index + 1];
    const added = change.added
      ? change.value
      : next?.added && change.removed
        ? (index++, next.value)
        : [];
    differences.push({
      category: categorize(removed, added),
      expected: show(removed),
      actual: show(added),
      path: pathAt(expected, position),
    });
    position += removed.length;
  }
  const total = expected.length + actual.length;
  return { equal: !differences.length, score: total ? (2 * kept) / total : 1, differences };
}
