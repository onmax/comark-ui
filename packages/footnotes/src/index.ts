import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import {
  addRule,
  BLOCK,
  SPAN,
  type MarkdownExit,
  type StateBlock,
  type StateInline,
} from "../../../shared/markdown-it.ts";
import { isElement } from "../../../shared/nodes.ts";

export type FootnotesMeta = {
  /** One readable sentence per problem with a footnote. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/footnotes/${string}`; message: string };

export interface FootnotesOptions {
  /** The section's heading. Default `"Footnotes"`; an empty string leaves the heading out. */
  label?: string;
  /** Whether a horizontal rule comes before the section. Default `true`. */
  hr?: boolean;
  /** The link from a note back to its reference. Default `"↩"`. */
  backRef?: string;
}

// The parser marks definitions, references, and inline notes with these tags, and `post` replaces every one of them.
// A label follows its tag, `cfn-ref:1`, since labels have no spaces and Comark parses attributes that look like JSON.
const DEF = "cfn-def:";
const REF = "cfn-ref:";
const NOTE = "cfn-note";

// The rules below are ported from markdown-it-footnote (MIT, Vitaly Puzrin and Alex Kocharin). They push tokens Comark
// builds with any tag instead of their own, which Comark would drop, and leave numbering to `post`.

/** `[^label]: text`, with the lines indented under it, as a block that holds the definition's own blocks. */
function definition(state: StateBlock, startLine: number, endLine: number, silent: boolean) {
  const start = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
  const max = state.eMarks[startLine] ?? 0;
  if (start + 4 > max) return false;
  if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5e)
    return false;
  let pos = start + 2;
  for (; pos < max; pos++) {
    const ch = state.src.charCodeAt(pos);
    if (ch === 0x20) return false;
    if (ch === 0x5d) break;
  }
  if (pos === start + 2) return false;
  if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3a) return false;
  if (silent) return true;
  pos++;

  const label = state.src.slice(start + 2, pos - 2);
  const open = state.push(`${BLOCK}_open`, DEF + label, 1);
  open.map = [startLine, 0];

  const saved = {
    bMark: state.bMarks[startLine] ?? 0,
    tShift: state.tShift[startLine] ?? 0,
    sCount: state.sCount[startLine] ?? 0,
    parentType: state.parentType,
  };
  const afterColon = pos;
  const initial = saved.sCount + pos - (saved.bMark + saved.tShift);
  let offset = initial;
  while (pos < max) {
    const ch = state.src.charCodeAt(pos);
    if (ch === 0x09) offset += 4 - (offset % 4);
    else if (ch === 0x20) offset++;
    else break;
    pos++;
  }
  state.tShift[startLine] = pos - afterColon;
  state.sCount[startLine] = offset - initial;
  state.bMarks[startLine] = afterColon;
  state.blkIndent += 4;
  state.parentType = "footnote";
  if ((state.sCount[startLine] ?? 0) < state.blkIndent)
    state.sCount[startLine] = (state.sCount[startLine] ?? 0) + state.blkIndent;

  state.md.block.tokenize(state, startLine, endLine);

  state.parentType = saved.parentType;
  state.blkIndent -= 4;
  state.tShift[startLine] = saved.tShift;
  state.sCount[startLine] = saved.sCount;
  state.bMarks[startLine] = saved.bMark;
  open.map[1] = state.line;
  state.push(`${BLOCK}_close`, DEF + label, -1);
  return true;
}

/** `[^label]`, as an empty span with the label. Whether a definition exists is decided in `post`, which reports it. */
function reference(state: StateInline, silent: boolean) {
  const start = state.pos;
  const max = state.posMax;
  if (start + 3 > max) return false;
  if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5e)
    return false;
  let pos = start + 2;
  for (; pos < max; pos++) {
    const ch = state.src.charCodeAt(pos);
    if (ch === 0x20 || ch === 0x0a) return false;
    if (ch === 0x5d) break;
  }
  if (pos === start + 2 || pos >= max) return false;
  const end = skipIncomplete(state, pos + 1);
  // `[^text](url)` and `[^text][ref]` are links.
  const next = state.src.charCodeAt(end);
  if (end === pos + 1 && (next === 0x28 || next === 0x5b)) return false;
  if (!silent) {
    const tag = REF + state.src.slice(start + 2, pos);
    state.push(`${SPAN}_open`, tag, 1);
    state.push(`${SPAN}_close`, tag, -1);
  }
  state.pos = end;
  return true;
}

/** `^[text]`, a note written where it applies, as a span holding the note's inline content. */
function inlineNote(state: StateInline, silent: boolean) {
  const start = state.pos;
  const max = state.posMax;
  if (start + 2 >= max) return false;
  if (state.src.charCodeAt(start) !== 0x5e || state.src.charCodeAt(start + 1) !== 0x5b)
    return false;
  const end = state.md.helpers.parseLinkLabel(state, start + 1);
  if (end < 0) return false;
  if (!silent) {
    state.push(`${SPAN}_open`, NOTE, 1);
    state.pos = start + 2;
    state.posMax = end;
    state.md.inline.tokenize(state);
    state.push(`${SPAN}_close`, NOTE, -1);
  }
  state.pos = skipIncomplete(state, end + 1);
  state.posMax = max;
  return true;
}

// Comark's autoClose finishes an unclosed `[` as a link to this placeholder; a note or reference still being written
// takes it in, so a stream shows the note rather than a broken link.
const INCOMPLETE = "(comark:incomplete-link)";
const skipIncomplete = (state: StateInline, pos: number) =>
  state.src.startsWith(INCOMPLETE, pos) ? pos + INCOMPLETE.length : pos;

// At module level, so every parse reuses Comark's cached parser. References go before Comark's `[span]` rule, which
// would otherwise read `[^1]` as a span.
const markdownIt = (md: MarkdownExit) => {
  addRule(md.block.ruler, "before", ["reference"], "footnote_def", definition, {
    alt: ["paragraph", "reference"],
  });
  addRule(md.inline.ruler, "before", ["comark_inline_span", "link"], "footnote_inline", inlineNote);
  addRule(md.inline.ruler, "before", ["comark_inline_span", "link"], "footnote_ref", reference);
};

// Comark's own label escaping, so ids match the ones its footnotes plugin writes.
const sanitizeLabel = (label: string) =>
  label.replace(/[^a-zA-Z0-9_-]/g, (char) => `-${char.charCodeAt(0).toString(16)}-`);
/** The label after a marker's tag, or nothing for another element. */
const labelAfter = (marker: string, [tag]: ElementNode) =>
  tag.startsWith(marker) ? tag.slice(marker.length) : undefined;
const childrenOf = ([, , ...children]: ElementNode): Node[] => children;

type Footnote = { label: string; id: string; content: Node[]; refs: number };
// A streaming parse reuses finished blocks from the last parse as they are, references already numbered and their
// inline notes gone from the tree. This keeps what each reference stood for, so the notes are rebuilt.
const built = new WeakMap<ElementNode, { label: string; content: Node[] }>();
// Unresolved references render as text for the current stream chunk, but their parent is reused on later parses.
// Keep the label beside that text so a definition arriving in a later chunk can promote it.
const pending = new WeakMap<object, Map<number, string>>();

/** Takes every definition out of the tree, wherever it sits, keeping the first for each label and noting the repeats. */
function takeDefinitions(
  nodes: Node[],
  start: number,
  found: Map<string, Node[]>,
  repeated: Set<string>,
) {
  for (let index = nodes.length - 1; index >= start; index--) {
    const node = nodes[index];
    if (!isElement(node)) continue;
    const label = labelAfter(DEF, node);
    if (label !== undefined) {
      nodes.splice(index, 1);
      const content = childrenOf(node);
      // Definitions may contain any blocks, including another footnote definition. Extract
      // nested definitions before keeping the outer content so their markers do not leak.
      takeDefinitions(content, 0, found, repeated);
      if (found.has(label)) repeated.add(label);
      found.set(label, content);
      continue;
    }
    // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
    takeDefinitions(node as Node[], 2, found, repeated);
  }
}

/**
 * Footnotes: `[^label]` references with `[^label]: …` definitions, which can run over indented lines and hold any
 * blocks, and `^[inline notes]`. They're numbered in the order they're first referenced and listed at the end.
 * It is named `footnotes`, so it takes the place of `comark/plugins/footnotes`, with the same nodes.
 */
export default defineComarkPlugin<FootnotesOptions, FootnotesMeta>((options) => {
  const { label = "Footnotes", hr = true, backRef = "↩" } = options ?? {};
  return {
    name: "footnotes",
    markdownItPlugins: [markdownIt],
    post(state) {
      const { tree } = state;
      const issues: Issue[] = [];
      const definitions = new Map<string, Node[]>();
      const repeated = new Set<string>();
      takeDefinitions(tree.nodes, 0, definitions, repeated);

      const notes = new Map<string, Footnote>();
      const missing = new Set<string>();
      const ids = new Set([...definitions.keys()].map(sanitizeLabel));
      let inline = 0;
      const autoLabel = () => {
        let next: string;
        do next = `note-${++inline}`;
        while (definitions.has(next) || notes.has(next) || ids.has(sanitizeLabel(next)));
        ids.add(sanitizeLabel(next));
        return next;
      };
      const refTo = (key: string, content: () => Node[]): ElementNode => {
        let note = notes.get(key);
        if (!note) {
          note = { label: key, id: sanitizeLabel(key), content: content(), refs: 0 };
          notes.set(key, note);
        }
        const count = ++note.refs;
        const sup: ElementNode = [
          "sup",
          { class: "footnote-ref" },
          [
            "a",
            {
              href: `#fn-${note.id}`,
              id: count === 1 ? `fnref-${note.id}` : `fnref-${note.id}-${count}`,
            },
            `[${[...notes.keys()].indexOf(key) + 1}]`,
          ],
        ];
        built.set(sup, { label: key, content: note.content });
        return sup;
      };

      const replace = (nodes: Node[], start: number) => {
        for (let index = start; index < nodes.length; index++) {
          const node = nodes[index];
          const waiting = pending.get(nodes)?.get(index);
          if (waiting !== undefined && node === `[^${waiting}]`) {
            const content = definitions.get(waiting);
            if (content) {
              nodes[index] = refTo(waiting, () => content);
              pending.get(nodes)?.delete(index);
              continue;
            }
            missing.add(waiting);
            continue;
          }
          if (!isElement(node)) continue;
          const [tag] = node;
          const key = labelAfter(REF, node);
          const previous = tag === "sup" ? built.get(node) : undefined;
          if (key !== undefined) {
            const content = definitions.get(key);
            if (content) nodes[index] = refTo(key, () => content);
            else {
              nodes[index] = `[^${key}]`;
              let entries = pending.get(nodes);
              if (!entries) pending.set(nodes, (entries = new Map()));
              entries.set(index, key);
              missing.add(key);
            }
          } else if (tag === NOTE) {
            const content = childrenOf(node);
            nodes[index] = refTo(autoLabel(), () => content);
          } else if (previous) nodes[index] = refTo(previous.label, () => previous.content);
          if (nodes[index] !== node) continue;
          // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
          replace(node as Node[], 2);
        }
      };
      replace(tree.nodes, 0);
      // Notes can reference other notes; those are numbered after the ones the text references.
      for (const note of notes.values()) replace(note.content, 0);

      for (const key of missing)
        issues.push({
          rule: "comark/footnotes/missing-definition",
          message: `footnotes: [^${key}] has no definition; add a "[^${key}]: …" line, or remove the reference.`,
        });
      for (const key of definitions.keys())
        if (!notes.has(key))
          issues.push({
            rule: "comark/footnotes/unused-definition",
            message: `footnotes: [^${key}]: is never referenced; add [^${key}] where it applies, or remove the definition.`,
          });
      for (const key of repeated)
        issues.push({
          rule: "comark/footnotes/duplicate-definition",
          message: `footnotes: [^${key}]: is defined more than once, and only the first shows; give the others their own labels, or remove them.`,
        });
      if (issues.length) {
        tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
        tree.meta.issueRules = {
          ...tree.meta.issueRules,
          ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
        };
      }
      if (!notes.size) return;

      const items = [...notes.values()].map((note): ElementNode => {
        const backrefs = Array.from({ length: note.refs }, (_, index): Node[] => [
          " ",
          [
            "a",
            {
              href: index ? `#fnref-${note.id}-${index + 1}` : `#fnref-${note.id}`,
              class: "footnote-backref",
            },
            backRef,
          ],
        ]).flat();
        const content = [...note.content];
        const last = content.at(-1);
        // A note of several blocks takes its links back inside its last paragraph, as markdown-it-footnote's do.
        if (isElement(last) && last[0] === "p")
          content[content.length - 1] = [...last, ...backrefs];
        else content.push(...backrefs);
        return ["li", { id: `fn-${note.id}` }, ...content];
      });
      const rule: ElementNode[] = hr ? [["hr", {}]] : [];
      const heading: ElementNode[] = label ? [["h2", { id: "footnotes" }, label]] : [];
      tree.nodes.push([
        "section",
        { class: "footnotes" },
        ...rule,
        ...heading,
        ["ol", { class: "footnotes-list" }, ...items],
      ]);
    },
  };
});
