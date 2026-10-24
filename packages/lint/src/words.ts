/** The candidate nearest to `word`, when one is close enough to be a typo of it. */
export function closest(word: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Math.max(1, Math.floor(word.length / 3)) + 1;
  for (const candidate of candidates) {
    const distance = levenshtein(word, candidate);
    if (distance < bestDistance) [best, bestDistance] = [candidate, distance];
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1]! + 1,
        row[j]! + 1,
        row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length]!;
}

const LISTED = 20;

/** The ids a fragment could link to, as a sentence that starts with `label`. */
export function listIds(ids: Iterable<string>, label: string, none: string): string {
  const list = [...ids].map((id) => `\`#${id}\``);
  if (!list.length) return none;
  const more = list.length > LISTED ? `, and ${list.length - LISTED} more` : "";
  return `${label}: ${list.slice(0, LISTED).join(", ")}${more}.`;
}

export function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
