import type { ElementNode, Node } from "comark";

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
// SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
const childrenOf = (node: ElementNode) => node.slice(2) as Node[];

// Expressive Code's terminal languages that Shiki also knows.
const terminals = new Set([
  "ansi",
  "bash",
  "console",
  "sh",
  "shell",
  "shellscript",
  "shellsession",
  "zsh",
]);
const frames = new Set(["auto", "code", "terminal", "none"]);
const markers = ["ins", "del", "mark"] as const;

export type Issue = { rule: `comark/code/${string}` | `comark/icon/${string}`; message: string };

type Word = { key?: string; value?: string; raw: string };

// A word is `key`, `key=value`, `key="value"`, or `key={ranges}`, as Expressive Code writes them.
function wordsOf(meta: string): Word[] {
  return [
    ...meta.matchAll(/([A-Za-z][\w-]*)(?:=("[^"]*"|'[^']*'|\{[^}]*\}|[^\s"'{}]+))?|\S+/g),
  ].map(([raw, key, value]) => ({ key, value, raw }));
}

const unquote = (value: string) => value.replace(/^(["'])(.*)\1$/s, "$2");
const on = (word: Word) => word.value === undefined || unquote(word.value) !== "false";

/** Line numbers as Expressive Code writes them, `3-4,7`, folded from a sorted list. */
function rangesOf(lines: number[]) {
  const parts: string[] = [];
  for (let at = 0; at < lines.length; at++) {
    const start = lines[at]!;
    while (lines[at + 1] === lines[at]! + 1) at++;
    parts.push(lines[at] === start ? `${start}` : `${start}-${lines[at]}`);
  }
  return parts.join(",");
}

// Only a pasted `git diff` has hunk headers, so only then are the lines before the first hunk its file headers.
const fileHeader =
  /^(diff --git |index |--- |\+\+\+ |new file mode|deleted file mode|old mode|new mode|similarity index|rename (from|to) |Binary files )/;

/**
 * Turns a ```` ```diff lang="ts" ```` fence into a `ts` fence marked `ins` and `del`, with the `+` and `-` taken off its
 * lines, before Shiki reads it. A pasted `git diff` loses its file and hunk headers too.
 */
export function fromDiff(
  info: string,
  content: string,
): { info: string; content: string } | undefined {
  const match = /^diff\s+(.*)$/s.exec(info.trim());
  if (!match) return;
  const words = wordsOf(match[1]!);
  const lang = words.find((word) => word.key === "lang" && word.value);
  if (!lang) return;
  const trailing = content.endsWith("\n");
  let lines = (trailing ? content.slice(0, -1) : content).split("\n");
  if (lines.some((line) => line.startsWith("@@ "))) {
    const first = lines.findIndex((line) => line.startsWith("@@ "));
    lines = lines.filter(
      (line, at) =>
        !(at < first && fileHeader.test(line)) &&
        !line.startsWith("@@ ") &&
        !line.startsWith("\\ No newline"),
    );
  }
  // Pasted diffs keep a column for the sign, so context lines start with a space. Hand-written ones often don't.
  const column = lines.every((line) => !line || /^[-+ ]/.test(line));
  const ins: number[] = [];
  const del: number[] = [];
  const code = lines.map((line, at) => {
    if (line.startsWith("+")) ins.push(at + 1);
    else if (line.startsWith("-")) del.push(at + 1);
    else if (!column || !line.startsWith(" ")) return line;
    return line.slice(1);
  });
  const rest = words.filter((word) => word !== lang).map((word) => word.raw);
  if (ins.length) rest.push(`ins={${rangesOf(ins)}}`);
  if (del.length) rest.push(`del={${rangesOf(del)}}`);
  return {
    info: [unquote(lang.value!), ...rest].join(" "),
    content: code.join("\n") + (trailing ? "\n" : ""),
  };
}

type Range = [number, number];

/** What a code block's fence asks for, read from the words Comark leaves in its `meta`. */
type Asked = {
  ranges: Record<(typeof markers)[number] | "collapse", string[]>;
  numbers?: boolean;
  start?: string;
  title?: string;
  frame?: string;
  wrap?: boolean;
  rest: string[];
};

function ask(meta: string): Asked {
  const asked: Asked = { ranges: { ins: [], del: [], mark: [], collapse: [] }, rest: [] };
  for (const word of wordsOf(meta)) {
    const value = word.value === undefined ? undefined : unquote(word.value);
    if (word.key === "ins" || word.key === "del" || word.key === "mark" || word.key === "collapse")
      asked.ranges[word.key].push(word.value ?? "");
    else if (word.key === "showLineNumbers") asked.numbers = on(word);
    else if (word.key === "startLineNumber" && value !== undefined) asked.start = value;
    else if (word.key === "title" && value) asked.title = value;
    else if (word.key === "frame" && value) asked.frame = value;
    else if (word.key === "wrap") asked.wrap = on(word);
    else asked.rest.push(word.raw);
  }
  return asked;
}

const asksForLines = (asked: Asked) =>
  Object.values(asked.ranges).some((values) => values.length) ||
  asked.numbers !== undefined ||
  asked.start !== undefined;

const text = (node: Node): string =>
  Array.isArray(node) ? (isElement(node) ? childrenOf(node).map(text).join("") : "") : node;

/** How an issue names a block: its file, else its first line, so the author can find it. */
export function nameOf(pre: ElementNode): string {
  const attrs = pre[1];
  // SAFETY: Comark writes a fence's language and filename as strings.
  const { language: written, filename } = attrs as { language?: string; filename?: string };
  const language = written ? `${written} ` : "";
  if (filename) return `The ${language}code block "${filename}"`;
  const first = text(pre).trim().split("\n")[0]!.trim();
  if (!first) return `An empty ${language}code block`;
  return `The ${language}code block that starts "${first.length > 40 ? `${first.slice(0, 40)}…` : first}"`;
}

// Comark joins a line's classes only on the lines `{…}` highlights, so a Shiki transformer leaves the rest as arrays.
function classOf(node: ElementNode) {
  // SAFETY: Shiki writes a line's class as a string or a list of them.
  const value = node[1].class as string | string[] | undefined;
  return Array.isArray(value) ? value.join(" ") : (value ?? "");
}

/** The block's lines: Shiki's line spans, or the code split at each newline when nothing highlighted it. */
function linesOf(code: ElementNode): ElementNode[] {
  const children = childrenOf(code);
  if (children.some(isElement)) return children.filter(isElement);
  return children
    .map(text)
    .join("")
    .split("\n")
    .map((line): ElementNode =>
      line ? ["span", { class: "line" }, line] : ["span", { class: "line" }],
    );
}

function read(
  name: string,
  key: string,
  values: string[],
  count: number,
  issues: Issue[],
): Range[] {
  const ranges: Range[] = [];
  for (const value of values) {
    const inner = /^\{(.*)\}$/s.exec(value)?.[1];
    if (inner === undefined) {
      issues.push({
        rule: "comark/code/invalid-range",
        message: `${name} has ${key}${value ? `=${value}` : ""}, which isn't a line range, so no line is marked. Write the line numbers in braces, such as ${key}={2-4}.`,
      });
      continue;
    }
    for (const part of inner.split(",")) {
      const bounds = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
      const start = Number(bounds?.[1]);
      const end = Number(bounds?.[2] ?? bounds?.[1]);
      if (!bounds || start < 1 || end < start)
        issues.push({
          rule: "comark/code/invalid-range",
          message: `${name} has ${key}={${inner}}, and "${part.trim()}" isn't a line or a range from a lower line to a higher one. Write it like ${key}={2-4}.`,
        });
      else if (end > count)
        issues.push({
          rule: "comark/code/line-out-of-range",
          message: `${name} has ${key}={${inner}}, but it has ${count === 1 ? "1 line" : `${count} lines`}, so line ${end} doesn't exist. Mark lines from 1 to ${count}.`,
        });
      else ranges.push([start, end]);
    }
  }
  return ranges;
}

// Ranges that overlap would nest one `<details>` in another, so they become one.
function merge(ranges: Range[]): Range[] {
  const merged: Range[] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

const covers = (ranges: Range[], line: number) =>
  ranges.some(([start, end]) => line >= start && line <= end);

/**
 * Reads the block's fence and writes what it asks for. The title, frame, and wrap go on the `pre` for the components to
 * draw. When `split` is set, the lines are rewritten too: each a block with its markers as classes, its number in
 * `data-line`, and its newline inside it, so it can take a background, and collapsed ranges inside `<details>`.
 * Returns whether the fence asked for anything that needs the lines.
 */
export function lines(pre: ElementNode, split: boolean, issues: Issue[]): boolean {
  const attrs = pre[1];
  // SAFETY: Comark writes what follows a fence's language and title as one string.
  const meta = (attrs.meta as string | undefined) ?? "";
  const asked = ask(meta);
  if (asked.title && !attrs.filename) attrs.filename = asked.title;
  const name = nameOf(pre);
  // SAFETY: Comark writes a fence's language and filename as strings, and `title` is one too.
  const written = attrs as { language?: string; filename?: string };
  const language = (written.language ?? "").toLowerCase();
  const filename = written.filename ?? "";
  if (asked.frame && !frames.has(asked.frame))
    issues.push({
      rule: "comark/code/unknown-frame",
      message: `${name} has frame="${asked.frame}", which comark-code doesn't draw. Write frame="terminal", frame="code", or frame="none".`,
    });
  // Like Expressive Code, a shell script named like a file is a file, not a terminal session.
  if (
    asked.frame === "terminal" ||
    ((!asked.frame || asked.frame === "auto") &&
      terminals.has(language) &&
      !/\.\w+$/.test(filename))
  )
    attrs.frame = "terminal";
  if (asked.wrap) attrs.wrap = true;

  const wanted = asksForLines(asked);
  const code = pre[2];
  if (!split || !isElement(code) || code[0] !== "code") {
    if (wanted) asked.rest.unshift(...lineWords(meta));
    finish(attrs, asked.rest);
    return wanted;
  }

  const found = linesOf(code);
  const count = found.length;
  // SAFETY: the entries are one per marker, keyed by its name.
  const marks = Object.fromEntries(
    markers.map((key) => [key, read(name, key, asked.ranges[key], count, issues)]),
  ) as Record<(typeof markers)[number], Range[]>;
  const folds = merge(read(name, "collapse", asked.ranges.collapse, count, issues));
  let start = 1;
  if (asked.start !== undefined) {
    if (/^\d+$/.test(asked.start)) start = Number(asked.start);
    else
      issues.push({
        rule: "comark/code/invalid-start-line",
        message: `${name} has startLineNumber=${asked.start}, which isn't a whole number, so its lines are numbered from 1. Write one such as startLineNumber=120.`,
      });
  }
  const numbers = asked.numbers ?? asked.start !== undefined;
  // SAFETY: Comark writes `{…}` highlights as an array of line numbers.
  const highlights = new Set(Array.isArray(attrs.highlights) ? (attrs.highlights as number[]) : []);
  const restyled =
    wanted || highlights.size > 0 || found.some((line) => classOf(line).trim() !== "line");
  finish(attrs, asked.rest);
  if (!restyled) {
    for (const line of found) if (Array.isArray(line[1].class)) line[1].class = classOf(line);
    return wanted;
  }

  const drawn = found.map((line, at): ElementNode => {
    const number = at + 1;
    const classes = classOf(line).split(/\s+/).filter(Boolean);
    if (!classes.includes("line")) classes.unshift("line");
    if (highlights.has(number) && !classes.includes("highlight")) classes.push("highlight");
    for (const key of markers) if (covers(marks[key], number)) classes.push(`ck-${key}`);
    // Comark's inline `display` on each line would beat the stylesheet that makes lines blocks.
    const { style: _, class: __, ...rest } = line[1];
    return [
      "span",
      { ...rest, class: classes.join(" "), ...(numbers && { "data-line": `${start + at}` }) },
      ...childrenOf(line),
      ...(number < count ? ["\n"] : []),
    ];
  });
  const children: Node[] = [];
  for (let at = 0; at < count; at++) {
    const fold = folds.find(([first]) => first === at + 1);
    if (!fold) {
      children.push(drawn[at]!);
      continue;
    }
    const size = fold[1] - fold[0] + 1;
    children.push([
      "details",
      { class: "ck-fold" },
      ["summary", {}, size === 1 ? "1 collapsed line" : `${size} collapsed lines`],
      ...drawn.slice(at, fold[1]),
    ]);
    at = fold[1] - 1;
  }
  pre[2] = [code[0], code[1], ...children];
  attrs.lines = true;
  if (numbers) attrs.numbers = `${start + count - 1}`.length;
  return wanted;
}

// The words that only work on the lines, kept in `meta` when the lines can't be rewritten.
const lineWords = (meta: string) =>
  wordsOf(meta)
    .filter((word) =>
      ["ins", "del", "mark", "collapse", "showLineNumbers", "startLineNumber"].includes(
        word.key ?? "",
      ),
    )
    .map((word) => word.raw);

function finish(attrs: Record<string, unknown>, rest: string[]) {
  if (rest.length) attrs.meta = rest.join(" ");
  else delete attrs.meta;
}
