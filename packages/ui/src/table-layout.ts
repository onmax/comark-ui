import { defineComarkPlugin, type ElementNode, type Node } from "comark";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { STACK_COLUMNS, STACK_ROWS, TABLE_WIDTHS } from "./typeset-css.ts";

/** A column whose longest cell has this many characters or fewer is short: an id, a link, a status, a date. */
const SHORT = 24;
/** A column whose cells average this many characters or more reads as prose. */
const PROSE = 32;
/** A prose column is measured as if no cell ran past this many characters: a readable line, not one line per cell. */
const MEASURE = 52;
/** Wider than this, in em, a table needs more than a readable column. */
const COLUMN = 46;

// Text is a string, an element an array, and a comment an array with a null tag, which has no text.
const text = (node: Node): string =>
  isElement(node) ? childrenOf(node).map(text).join("") : Array.isArray(node) ? "" : node;
// A chip draws an icon and padding beside its label, worth about three characters.
const chips = (node: Node): number =>
  isElement(node)
    ? (node[0] === "chip" ? 1 : 0) + childrenOf(node).reduce((sum, child) => sum + chips(child), 0)
    : 0;

const rowsOf = (table: ElementNode): ElementNode[] =>
  childrenOf(table)
    .filter(isElement)
    .flatMap((part) => (part[0] === "tr" ? [part] : childrenOf(part).filter(isElement)))
    .filter((row) => row[0] === "tr");
const cellsOf = (row: ElementNode): ElementNode[] =>
  childrenOf(row)
    .filter(isElement)
    .filter((cell) => cell[0] === "td" || cell[0] === "th");

/**
 * Reads a Markdown table's cells and returns how the typeset lays it out: the table itself, or the table in a `div`
 * that lets it grow. Every mark is a data attribute `typeset-css.ts` styles, so the page needs no script and the
 * author writes nothing.
 *
 * - `data-short` on each cell of a short column. The column never wraps, so `portal #1596` can't break into `#159` and
 *   `6`.
 * - A table wider than a readable column goes in a `div` with `data-wide` and `data-width`, its own width in em rounded
 *   up to a step, so it grows into the room beside the text like a wide diagram.
 * - A table with two or more prose columns also gets `data-stack` (its stacked column count and where its prose goes),
 *   and `data-col` and `data-row` on its cells. When the room it gets falls well short of its own width, the later
 *   prose columns move under the first, so a row reads as a line with its detail below rather than as narrow columns
 *   of a few words each.
 */
function layoutTable(table: ElementNode): ElementNode {
  const rows = rowsOf(table);
  const head = rows.find((row) => cellsOf(row).every((cell) => cell[0] === "th"));
  const body = rows.filter((row) => row !== head).map(cellsOf);
  const count = Math.max(0, ...rows.map((row) => cellsOf(row).length));
  if (!body.length || count < 2) return table;

  const columns = Array.from({ length: count }, (_, index) => {
    const lengths = body
      .map((cells) => cells[index])
      .filter((cell) => cell !== undefined)
      .map((cell) => text(cell).trim().length + 3 * chips(cell));
    const longest = Math.max(0, ...lengths);
    const average = lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length);
    const short = longest <= SHORT;
    return { short, prose: !short && average >= PROSE, longest };
  });
  for (const row of rows)
    cellsOf(row).forEach((cell, index) => {
      if (columns[index]?.short) cell[1]["data-short"] = "";
    });

  // About half an em per character, a little more for the short columns' names, numbers, and code, and 2em of padding
  // between columns.
  const width =
    columns.reduce(
      (sum, { short, longest }) =>
        sum + (short ? longest * 0.55 : Math.min(longest, MEASURE) * 0.5) + 2,
      0,
    ) - 1;
  const prose = columns.flatMap((column, index) => (column.prose ? [index] : []));
  const stacked = count - prose.length + 1;
  const stack = prose.length >= 2 && prose.length <= STACK_ROWS && stacked <= STACK_COLUMNS;
  if (width <= COLUMN && !stack) return table;

  const step = TABLE_WIDTHS.find((value) => value >= width) ?? TABLE_WIDTHS.at(-1)!;
  const wrapper: ElementNode = ["div", { "data-wide": "", "data-width": String(step) }, table];
  if (!stack) return wrapper;

  // Stacked, the prose takes one column where the first prose column was, and the others keep their order.
  const first = prose[0]!;
  const folded = (index: number) =>
    prose.filter((column) => column > first && column < index).length;
  wrapper[1]["data-stack"] = `${stacked}-${first + 1}`;
  // Stacked, the table becomes a grid, and some browsers then drop its table semantics, so it states them.
  table[1].role = "table";
  for (const part of childrenOf(table).filter(isElement))
    if (part[0] !== "tr") part[1].role = "rowgroup";
  for (const row of rows)
    cellsOf(row).forEach((cell, index) => {
      const own = prose.indexOf(index);
      row[1].role = "row";
      cell[1].role = cell[0] === "td" ? "cell" : row === head ? "columnheader" : "rowheader";
      cell[1]["data-col"] = String(own > 0 ? first + 1 : index - folded(index) + 1);
      if (own >= 0) cell[1]["data-row"] = String(own + 1);
    });
  return wrapper;
}

// Only the document's own tables get a layout. One inside a list item, a quote, or a cell keeps to its box.
function visit(nodes: Node[]) {
  nodes.forEach((node, index) => {
    if (!isElement(node)) return;
    if (node[0] === "table") nodes[index] = layoutTable(node);
    // comark-comments wraps the document's blocks in one root when a card goes in the margin. Its children start after
    // its tag and attributes.
    else if (node[0] === "comments")
      childrenOf(node).forEach((inner, child) => {
        if (isElement(inner) && inner[0] === "table") node[child + 2] = layoutTable(inner);
      });
  });
}

/** Lays out the document's Markdown tables (see `layoutTable`). The preset turns it on by default. */
export const tableLayout = defineComarkPlugin(() => ({
  name: "comark-ui-table-layout",
  post(state) {
    visit(state.tree.nodes);
  },
}));
