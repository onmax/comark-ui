// The values the component gallery offers for each prop, read from the reference tables in each package's docs: a
// table's first list of two or more values in code, like "`box`, `circle`, or `none`", or values that each start a
// sentence, like "`columns` puts … `slider` lays …". A package's tables are pooled by prop name, since most tables sit
// under a "Props" heading that doesn't name its block, so `color` offers every color its package's tables list.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const NAME = /^[\w-]+$/;
const VALUE = /^#?[\w.-]+$/;
// What may sit between two choices of one list: a gloss in parentheses, then a comma or "or". Not "and", which joins
// things that hold together, like "`x` and `y` from 0 to 100".
const BETWEEN = /^(?:\s*\([^)]*\))?\s*(?:,\s*(?:or)?|or)\s*$/;

const codes = (text: string) =>
  [...text.matchAll(/`([^`]+)`/g)].map((match) => ({
    value: match[1]!,
    start: match.index,
    end: match.index + match[0].length,
  }));

function listed(description: string) {
  const tokens = codes(description);
  let run: typeof tokens = [];
  for (const token of tokens) {
    const last = run.at(-1);
    // Code that can't be a value, like `%`, ends a list.
    if (!VALUE.test(token.value)) {
      if (run.length >= 2) break;
      run = [];
    } else if (last && BETWEEN.test(description.slice(last.end, token.start))) run.push(token);
    else if (run.length >= 2) break;
    else run = [token];
  }
  if (run.length >= 2) return run.map((token) => token.value);
  const sentences = description.split(/(?<=\.)\s+/);
  const starts = sentences.map((sentence) => /^`([^`]+)`/.exec(sentence)?.[1]);
  return sentences.length >= 2 && starts.every(Boolean) ? (starts as string[]) : [];
}

// A row's cells, split at pipes outside code.
const cells = (row: string) =>
  row
    .replace(/^\||\|$/g, "")
    .split(/\|(?=(?:[^`]*`[^`]*`)*[^`]*$)/)
    .map((cell) => cell.trim());

function tables(text: string, props: Map<string, Set<string>>) {
  const lines = text.split("\n");
  let fenced = false;
  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced || !/^\|\s*(?:Prop|Attribute)s?\s*\|/.test(line)) continue;
    for (const row of lines.slice(index + 2)) {
      if (!row.startsWith("|")) break;
      const [names = "", fallback = "", description = ""] = cells(row);
      const values = listed(description);
      const preset = codes(fallback);
      if (values.length && preset.length === 1) values.unshift(preset[0]!.value);
      for (const { value: name } of codes(names)) {
        if (!NAME.test(name)) continue;
        const known = props.get(name) ?? new Set();
        for (const value of values) if (VALUE.test(value)) known.add(value);
        props.set(name, known);
      }
    }
  }
}

const markdown = (dir: URL): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(".md"))
        .map((file) => readFileSync(new URL(file, dir), "utf8"))
    : [];

/** Each group's props, by name, with the values its docs list for them, for the gallery's editor. */
export function propsOf(groups: string[], dirOf: (group: string) => URL) {
  return Object.fromEntries(
    groups.map((group) => {
      const props = new Map<string, Set<string>>();
      for (const text of markdown(dirOf(group))) tables(text, props);
      return [group, Object.fromEntries([...props].map(([name, values]) => [name, [...values]]))];
    }),
  );
}
