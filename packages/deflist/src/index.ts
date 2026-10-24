import { defineComarkPlugin } from "comark";
import { addRule, BLOCK, type MarkdownExit, type StateBlock } from "../../../shared/markdown-it.ts";

// Ported from markdown-it-deflist (MIT, Vitaly Puzrin and Alex Kocharin). It pushes block tokens Comark builds with
// any tag instead of its own, which Comark would drop, and leaves tight items without paragraphs.

// The indent of the definition being read, which markdown-it-deflist keeps on the block state as `ddIndent`.
const ddIndents = new WeakMap<StateBlock, number>();

/** The position after `:` or `~` and the space that must follow it, or -1 if the line doesn't start a definition. */
function skipMarker(state: StateBlock, line: number) {
  let start = (state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0);
  const max = state.eMarks[line] ?? 0;
  if (start >= max) return -1;
  // Definition markers must not be indented into a code block.
  if ((state.sCount[line] ?? 0) - state.blkIndent >= 4) return -1;
  const marker = state.src.charCodeAt(start++);
  if (marker !== 0x7e && marker !== 0x3a) return -1;
  const pos = state.skipSpaces(start);
  // Require a separating space when content follows the marker. An empty
  // definition is valid when the marker is followed by whitespace to EOL.
  if (start === pos && pos < max) return -1;
  return start;
}

const open = (state: StateBlock, tag: string, map: [number, number]) => {
  const token = state.push(`${BLOCK}_open`, tag, 1);
  token.map = map;
  return token;
};
const close = (state: StateBlock, tag: string) => state.push(`${BLOCK}_close`, tag, -1);

/** Drops the paragraphs directly in a tight list's items, the way markdown-it hides them in a tight bullet list. */
function unwrapTight(state: StateBlock, from: number) {
  const level = state.level + 2;
  const { tokens } = state;
  for (let index = tokens.length - 3; index > from; index--) {
    const token = tokens[index];
    if (token?.level !== level || token.type !== "paragraph_open") continue;
    tokens.splice(index + 2, 1);
    tokens.splice(index, 1);
  }
}

function deflist(state: StateBlock, startLine: number, endLine: number, silent: boolean) {
  if (silent) {
    // As in markdown-it-deflist, validation only checks a definition, not a whole list.
    if ((ddIndents.get(state) ?? -1) < 0) return false;
    return skipMarker(state, startLine) >= 0;
  }

  let nextLine = startLine + 1;
  if (nextLine >= endLine) return false;
  let termLoose = false;
  if (state.isEmpty(nextLine)) {
    termLoose = true;
    if (++nextLine >= endLine) return false;
  }
  if ((state.sCount[nextLine] ?? 0) < state.blkIndent) return false;
  let contentStart = skipMarker(state, nextLine);
  if (contentStart < 0) return false;

  const listIndex = state.tokens.length;
  let tight = !termLoose;
  const listLines: [number, number] = [startLine, 0];
  open(state, "dl", listLines);

  let dtLine = startLine;
  let ddLine = nextLine;
  // A list holds several terms, and a term several definitions: the inner loop reads definitions, the outer terms.
  outer: for (;;) {
    let prevEmptyEnd = false;
    open(state, "dt", [dtLine, dtLine]);
    const inline = state.push("inline", "", 0);
    inline.map = [dtLine, dtLine];
    inline.content = state.getLines(dtLine, dtLine + 1, state.blkIndent, false).trim();
    inline.children = [];
    close(state, "dt");

    for (;;) {
      const itemLines: [number, number] = [nextLine, 0];
      open(state, "dd", itemLines);

      let pos = contentStart;
      const max = state.eMarks[ddLine] ?? 0;
      let offset =
        (state.sCount[ddLine] ?? 0) +
        contentStart -
        ((state.bMarks[ddLine] ?? 0) + (state.tShift[ddLine] ?? 0));
      while (pos < max) {
        const ch = state.src.charCodeAt(pos);
        if (ch === 0x09) offset += 4 - (offset % 4);
        else if (ch === 0x20) offset++;
        else break;
        pos++;
      }
      contentStart = pos;

      const saved = {
        tight: state.tight,
        ddIndent: ddIndents.get(state),
        blkIndent: state.blkIndent,
        tShift: state.tShift[ddLine] ?? 0,
        sCount: state.sCount[ddLine] ?? 0,
        parentType: state.parentType,
      };
      state.blkIndent = (state.sCount[ddLine] ?? 0) + 2;
      ddIndents.set(state, state.blkIndent);
      state.tShift[ddLine] = contentStart - (state.bMarks[ddLine] ?? 0);
      state.sCount[ddLine] = offset;
      state.tight = true;
      state.parentType = "deflist";

      state.md.block.tokenize(state, ddLine, endLine);

      // An item that ends in a blank line makes the list loose, unless it's the last, where the blank ends the list.
      if (!state.tight || prevEmptyEnd) tight = false;
      prevEmptyEnd = state.line - ddLine > 1 && state.isEmpty(state.line - 1);

      state.tShift[ddLine] = saved.tShift;
      state.sCount[ddLine] = saved.sCount;
      state.tight = saved.tight;
      state.parentType = saved.parentType;
      state.blkIndent = saved.blkIndent;
      if (saved.ddIndent === undefined) ddIndents.delete(state);
      else ddIndents.set(state, saved.ddIndent);

      close(state, "dd");
      itemLines[1] = nextLine = state.line;

      if (nextLine >= endLine) break outer;
      if ((state.sCount[nextLine] ?? 0) < state.blkIndent) break outer;
      contentStart = skipMarker(state, nextLine);
      if (contentStart < 0) break;
      ddLine = nextLine;
    }

    if (nextLine >= endLine) break;
    dtLine = nextLine;
    if (state.isEmpty(dtLine)) break;
    if ((state.sCount[dtLine] ?? 0) < state.blkIndent) break;
    ddLine = dtLine + 1;
    if (ddLine >= endLine) break;
    if (state.isEmpty(ddLine)) {
      tight = false;
      ddLine++;
    }
    if (ddLine >= endLine) break;
    if ((state.sCount[ddLine] ?? 0) < state.blkIndent) break;
    contentStart = skipMarker(state, ddLine);
    if (contentStart < 0) break;
  }

  close(state, "dl");
  listLines[1] = nextLine;
  state.line = nextLine;
  if (tight) unwrapTight(state, listIndex);
  return true;
}

// At module level, so every parse reuses Comark's cached parser.
const markdownIt = (md: MarkdownExit) =>
  addRule(md.block.ruler, "before", ["paragraph"], "deflist", deflist, {
    alt: ["paragraph", "reference", "blockquote"],
  });

/**
 * Definition lists: a term on one line, then one or more definitions that start with `: ` or `~ `, rendered as
 * `<dl>`, `<dt>`, and `<dd>`. A definition's indented lines continue it, so it can hold paragraphs, lists, and code.
 */
export default defineComarkPlugin(() => ({
  name: "comark-deflist",
  markdownItPlugins: [markdownIt],
}));
