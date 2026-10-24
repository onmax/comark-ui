import type { ComarkParseTokensState, ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";

export type CodeNotesMeta = {
  /** One readable sentence per problem with a fence's markers or notes. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/code-notes/${string}`; message: string };

/** The node the numbered list after an annotated fence becomes. Each item starts with its marker, linking back. */
export const NOTES_TAG = "code-notes";

/** What a `code-notes` node carries besides its items: the number of its first note. */
export type CodeNotesAttributes = { start?: number };

/** A fence with markers, as read from its tokens. */
interface Fence {
  name: string;
  code: string;
  /** The note numbers at the end of each line, by line index. */
  markers: Map<number, number[]>;
  notes: boolean;
  order: number;
}

const MARKERS = String.raw`<\d+>(?:\s*<\d+>)*`;
// A comment that holds only markers goes whole; one with words keeps them and loses the markers.
const ALONE = new RegExp(
  String.raw`\s*(?:(?://|#|--|;|%)\s*(${MARKERS})|(?:/\*|<!--)\s*(${MARKERS})\s*(?:\*/|-->))\s*$`,
);
const AFTER_WORDS = new RegExp(String.raw`((?://|#|--|;|%).*?\S)\s+(${MARKERS})\s*$`);
const BLOCK_WORDS = new RegExp(String.raw`^(.*?)(/\*|<!--)(.*?)\s+(${MARKERS})\s*(\*/|-->)\s*$`);

const MARKDOWN = new Set(["md", "mdc", "markdown", "comark"]);

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const textOf = (node: Node): string =>
  !Array.isArray(node) ? node : isElement(node) ? childrenOf(node).map(textOf).join("") : "";
const numbers = (markers: string) =>
  [...markers.matchAll(/\d+/g)].map(([digits]) => Number(digits));

// FNV-1a of the fence, so ids differ between documents on one page yet stay the same every time one renders.
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let at = 0; at < text.length; at++)
    value = Math.imul(value ^ text.charCodeAt(at), 0x01000193);
  return (value >>> 0).toString(36);
}

/** Strips the markers off each line, and says where they were. */
function strip(content: string) {
  const markers = new Map<number, number[]>();
  const lines = content.split("\n").map((line, index) => {
    const alone = ALONE.exec(line);
    if (alone) {
      markers.set(index, numbers(alone[1] ?? alone[2] ?? ""));
      return line.slice(0, alone.index);
    }
    const block = BLOCK_WORDS.exec(line);
    if (block) {
      markers.set(index, numbers(block[4] ?? ""));
      return `${block[1] ?? ""}${block[2] ?? ""}${(block[3] ?? "").trimEnd()} ${block[5] ?? ""}`;
    }
    const words = AFTER_WORDS.exec(line);
    if (!words) return line;
    markers.set(index, numbers(words[2] ?? ""));
    return line.slice(0, words.index) + (words[1] ?? "");
  });
  return { code: lines.join("\n"), markers };
}

/**
 * Takes the markers out of every fence a numbered list follows, before any plugin's `post`, so Shiki highlights the
 * code without them in any plugin order.
 */
function read(tokens: ComarkParseTokensState["tokens"]) {
  const fences: Fence[] = [];
  let count = 0;
  for (const [index, token] of tokens.entries()) {
    if (token.type !== "fence") continue;
    count++;
    const language = token.info.trim().split(/[\s[{]/, 1)[0] ?? "";
    // Markdown shows other fences, whose markers belong to them.
    if (MARKDOWN.has(language.toLowerCase())) continue;
    const { code, markers } = strip(token.content);
    if (!markers.size) continue;
    const name = `The \`\`\`${language} fence ${count}`;
    const notes = tokens[index + 1]?.type === "ordered_list_open";
    // A fence with no list after it keeps its markers as code; it may show the syntax itself.
    if (notes) token.content = code;
    fences.push({
      name,
      code: (notes ? code : token.content).replace(/\n+$/, ""),
      markers,
      notes,
      order: count,
    });
  }
  return fences;
}

const link = (note: number, uid: string, first: boolean): ElementNode => [
  "a",
  {
    class: "cn-marker",
    href: `#${uid}-${note}`,
    ...(first && { id: `${uid}-${note}-ref` }),
    "data-note": String(note),
    "aria-label": `Note ${note}`,
  },
];

// A marker with no note has nowhere to link, so it's drawn without one.
const marker = (note: number, uid: string, first: boolean, known: Set<number>): ElementNode =>
  known.has(note)
    ? link(note, uid, first)
    : ["span", { class: "cn-marker", "data-note": String(note) }];

/** Adds each line's markers to its end, in Shiki's line spans or in the plain code. */
function draw(code: ElementNode, fence: Fence, uid: string, known: Set<number>) {
  const seen = new Set<number>();
  const markersOf = (line: number) =>
    (fence.markers.get(line) ?? []).map((note) => {
      const first = !seen.has(note);
      seen.add(note);
      return marker(note, uid, first, known);
    });
  const children = childrenOf(code);
  const lines = children.filter(
    (child): child is ElementNode => isElement(child) && child[0] === "span",
  );
  if (lines.length) {
    for (const [index, line] of lines.entries()) line.push(...markersOf(index));
    return;
  }
  // Line spans, as Shiki writes them, so a Shiki that runs later skips this block instead of reading only its first line.
  const drawn = textOf(code)
    .split("\n")
    .flatMap((line, index): Node[] => [
      ...(index ? ["\n"] : []),
      ["span", { class: "line" }, line, ...markersOf(index)],
    ]);
  code.splice(2, code.length - 2, ...drawn);
}

/** A list's items, with the note number each one holds. */
function itemsOf(list: ElementNode) {
  const start = Number(list[1].start ?? 1) || 1;
  return childrenOf(list)
    .filter((child): child is ElementNode => isElement(child) && child[0] === "li")
    .map((item, index) => ({ item, note: start + index }));
}

function notesOf(list: ElementNode, fence: Fence, uid: string, issues: Issue[]): ElementNode {
  const start = Number(list[1].start ?? 1) || 1;
  const items = itemsOf(list);
  const used = new Set([...fence.markers.values()].flat());
  const known = new Set(items.map(({ note }) => note));
  for (const note of [...used].sort((a, b) => a - b))
    if (!known.has(note))
      issues.push({
        rule: "comark/code-notes/marker-without-note",
        message: `${fence.name}: marker <${note}> has no note, since the list after it ${items.length === 1 ? "has 1 item" : `has ${items.length} items`}. Add its note, or remove the marker.`,
      });
  for (const note of known)
    if (!used.has(note))
      issues.push({
        rule: "comark/code-notes/note-without-marker",
        message: `${fence.name}: note ${note} has no <${note}> marker in the code. Add \`// <${note}>\` at the end of its line, in the language's comment.`,
      });
  return [
    NOTES_TAG,
    start === 1 ? {} : { start },
    ...items.map(({ item, note }): ElementNode => {
      return [
        "li",
        { id: `${uid}-${note}` },
        used.has(note)
          ? [
              "a",
              {
                class: "cn-marker",
                href: `#${uid}-${note}-ref`,
                "data-note": String(note),
                "aria-label": `Back to marker ${note}`,
              },
            ]
          : ["span", { class: "cn-marker", "data-note": String(note) }],
        ["div", {}, ...childrenOf(item)],
      ];
    }),
  ];
}

/**
 * Turns `// <1>` at the end of a line in a fence, in the language's comment, into a numbered marker, and the numbered
 * list right after the fence into its notes, each linked to its marker and back. Markers are stripped before Shiki
 * highlights the code and drawn into its lines after, so put this plugin after Comark's `shiki` in `plugins`.
 * Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, CodeNotesMeta>(() => {
  // markdownItPost and post get the same state object, so one parse's fences never mix with another's.
  const parses = new WeakMap<object, Fence[]>();
  return {
    name: "comark-code-notes",
    markdownItPost(state) {
      parses.set(state, read(state.tokens));
    },
    post(state) {
      const fences = parses.get(state) ?? [];
      const { tree } = state;
      const issues: Issue[] = [];
      const names = (state.options.plugins ?? []).map((plugin) => plugin.name);
      const shikiLater = names.indexOf("shiki") > names.indexOf("comark-code-notes");
      let preOrder = 0;
      const walk = (nodes: Node[], start: number) => {
        for (let index = start; index < nodes.length; index++) {
          const node = nodes[index];
          if (!node || !isElement(node)) continue;
          if (node[0] !== "pre") {
            // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
            walk(node as Node[], 2);
            continue;
          }
          preOrder++;
          const fence = fences.find((candidate) => candidate.order === preOrder);
          if (!fence || !fence.markers.size) continue;
          if (!fence.notes) {
            issues.push({
              rule: "comark/code-notes/missing-notes",
              message: `${fence.name} has markers like \`<1>\` but no numbered list right after it, so they stay in the code. Write the notes as a numbered list right after the fence.`,
            });
            continue;
          }
          const next = nodes.findIndex((child, after) => after > index && isElement(child));
          const list = nodes[next];
          const code = childrenOf(node).find(
            (child): child is ElementNode => isElement(child) && child[0] === "code",
          );
          if (!list || !isElement(list) || list[0] !== "ol" || !code) continue;
          const uid = `cn-${hash(`${fence.name}\n${fence.code}`)}`;
          draw(code, fence, uid, new Set(itemsOf(list).map(({ note }) => note)));
          nodes[next] = notesOf(list, fence, uid, issues);
        }
      };
      walk(tree.nodes, 0);
      if (shikiLater && fences.some((fence) => fence.notes))
        issues.push({
          rule: "comark/code-notes/shiki-order",
          message:
            "Code notes: `shiki` comes after `comark-code-notes` in `plugins`, so the annotated code isn't highlighted. Put the code notes plugin after `shiki`.",
        });
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
