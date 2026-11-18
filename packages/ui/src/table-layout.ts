import { defineComarkPlugin, type ElementNode, type Node } from "comark";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import {
  FOLD_WIDTHS,
  GRID_COLUMNS,
  STACK_COLUMNS,
  STACK_ROWS,
  TABLE_WIDTHS,
  WEIGHTS,
} from "./typeset-css.ts";

/** A column whose longest cell has this many characters or fewer is short: an id, a link, a status, a date. */
const SHORT = 24;
/** A column whose cells average this many characters or more reads as prose. */
const PROSE = 32;
/** A prose column is measured as if no cell ran past this many characters: a readable line, not one line per cell. */
const MEASURE = 52;
/** Wider than this, in em, a table needs more than a readable column. */
const COLUMN = 46;
/** A column narrower than this, in em, reads a few words a line, so the table stacks its prose before it gets there. */
const READABLE = 9.5;

// Text is a string, an element an array, and a comment an array with a null tag, which has no text.
const text = (node: Node): string =>
  isElement(node) ? childrenOf(node).map(text).join("") : Array.isArray(node) ? "" : node;
const chipsOf = (node: Node): ElementNode[] =>
  isElement(node) ? (node[0] === "chip" ? [node] : childrenOf(node).flatMap(chipsOf)) : [];
// A chip draws an icon and padding beside its label, worth about three characters.
const lengthOf = (cell: ElementNode) => text(cell).trim().length + 3 * chipsOf(cell).length;

const rowsOf = (table: ElementNode): ElementNode[] =>
  childrenOf(table)
    .filter(isElement)
    .flatMap((part) => (part[0] === "tr" ? [part] : childrenOf(part).filter(isElement)))
    .filter((row) => row[0] === "tr");
const cellsOf = (row: ElementNode): ElementNode[] =>
  childrenOf(row)
    .filter(isElement)
    .filter((cell) => cell[0] === "td" || cell[0] === "th");
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** No long column gets less than this share of the room they share, so each keeps a few words a line. */
const LEAST = 0.05;

/**
 * How tall a table is, in lines, with each long column given `share` of `free` characters: each row is as tall as its
 * tallest cell, at least one line for the short cells beside it, and the tallest row counts twice, so no one row grows
 * far taller to save a line elsewhere.
 */
function heightOf(rows: number[][], share: number[], free: number) {
  let total = 0;
  let tallest = 0;
  for (const row of rows) {
    const height = Math.max(1, ...row.map((length, column) => length / (share[column]! * free)));
    total += height;
    tallest = Math.max(tallest, height);
  }
  return total + tallest;
}

/**
 * How much of the room the long columns share each one gets, from the length of each cell, `rows[row][column]`, so the
 * table is as short as it can be (`heightOf`). The height only grows as a column narrows, so the loop moves room between
 * each pair of columns to where the height is lowest, until no move helps. `free` is a typical room for these columns,
 * in characters; the shares hold at any other, apart from the rows of one line.
 */
function shares(rows: number[][], free = 80): number[] {
  const count = rows[0]!.length;
  let share = Array.from({ length: count }, () => 1 / count);
  for (let sweep = 0; sweep < 30; sweep++) {
    let moved = 0;
    for (let from = 0; from < count; from++)
      for (let to = from + 1; to < count; to++) {
        const shift = (by: number) =>
          share.map((value, column) =>
            column === from ? value + by : column === to ? value - by : value,
          );
        let low = LEAST - share[from]!;
        let high = share[to]! - LEAST;
        for (let step = 0; step < 24 && high > low; step++) {
          const a = low + (high - low) / 3;
          const b = high - (high - low) / 3;
          if (heightOf(rows, shift(a), free) <= heightOf(rows, shift(b), free)) high = b;
          else low = a;
        }
        const by = (low + high) / 2;
        if (heightOf(rows, shift(by), free) < heightOf(rows, share, free) - 1e-9) {
          moved += Math.abs(by);
          share = shift(by);
        }
      }
    if (moved < 1e-4) break;
  }
  return share;
}

/**
 * Reads a Markdown table's cells and returns how the typeset lays it out: the table itself, or the table in a `div`
 * that lets it grow. Every mark is a data attribute `typeset-css.ts` styles, so the page needs no script and the
 * author writes nothing.
 *
 * - `data-short` on each body cell of a short column, and on its header when the header is no longer. The cell never
 *   wraps, so `portal #1596` can't break into `#159` and `6`. One with two chips or more is `data-short="chips"`: it
 *   may break between them, never inside one.
 * - A table wider than a readable column goes in a `div` with `data-wide` and `data-width`, its own width in em rounded
 *   up to a step, so it grows into the room beside the text like a wide diagram.
 * - When two or more of its columns hold more than short values, the table is a grid (`data-cols`): the short columns
 *   take what their cells need, and the others share the rest by `data-w<column>`, their weight in whole steps.
 * - A table with two or more prose columns also gets `data-stack` (its stacked column count and where its prose
 *   goes), `data-fold` (the width in em below which it stacks), and `data-col` and `data-row` on its cells. Below that
 *   width the narrowest prose column would read a few words a line, so the later prose columns move under the first,
 *   and a row reads as a line with its detail below.
 * - A table with prose that may become a grid states its table roles, since some browsers drop them from a grid. On a
 *   phone it becomes one column per row.
 */
function layoutTable(table: ElementNode): ElementNode {
  const rows = rowsOf(table);
  // Grid placement cannot preserve native occupied slots from spanning cells.
  if (rows.some((row) => cellsOf(row).some((cell) => "colspan" in cell[1] || "rowspan" in cell[1])))
    return table;
  const head = rows.find((row) => cellsOf(row).every((cell) => cell[0] === "th"));
  const body = rows.filter((row) => row !== head).map(cellsOf);
  const count = Math.max(0, ...rows.map((row) => cellsOf(row).length));
  if (!body.length || count < 2) return table;

  const columns = Array.from({ length: count }, (_, index) => {
    const cells = body.map((cells) => cells[index]).filter((cell) => cell !== undefined);
    const lengths = cells.map(lengthOf);
    const header = head && cellsOf(head)[index];
    const own = header ? lengthOf(header) : 0;
    const longest = Math.max(0, ...lengths);
    const average = sum(lengths) / Math.max(1, lengths.length);
    const short = longest <= SHORT;
    // Where a cell's chips may break apart, the column needs only its widest chip.
    const tightest = Math.max(
      0,
      ...cells.map((cell) => {
        const chips = chipsOf(cell);
        return chips.length > 1 ? Math.max(...chips.map(lengthOf)) : lengthOf(cell);
      }),
    );
    return {
      short,
      prose: !short && average >= PROSE,
      longest: Math.max(longest, own),
      // A header no longer than its cells, or a word or two, keeps to one line beside them.
      headerShort: short && own <= Math.max(longest, 12),
      tight: Math.max(tightest, Math.min(own, 12)),
    };
  });
  for (const row of rows)
    cellsOf(row).forEach((cell, index) => {
      const column = columns[index];
      if (!column?.short) return;
      if (row !== head) cell[1]["data-short"] = chipsOf(cell).length > 1 ? "chips" : "";
      else if (column.headerShort) cell[1]["data-short"] = "";
    });

  // About half an em per character, a little more for the short columns' names, numbers, and code, and 2em of padding
  // between columns.
  const width =
    sum(
      columns.map(
        ({ short, longest }) => (short ? longest * 0.55 : Math.min(longest, MEASURE) * 0.5) + 2,
      ),
    ) - 1;
  const prose = columns.flatMap((column, index) => (column.prose ? [index] : []));
  const long = columns.flatMap((column, index) => (column.short ? [] : [index]));
  const wide = width > COLUMN;
  if (!wide && !prose.length) return table;

  const step = TABLE_WIDTHS.find((value) => value >= width) ?? TABLE_WIDTHS.at(-1)!;
  // A page reads data-width as the table's own width (Drop moves its outline aside for one wider than the text), so a
  // table that fits the column is wrapped only for its phone layout, as data-fit.
  const wrapper: ElementNode = [
    "div",
    wide ? { "data-wide": "", "data-width": String(step) } : { "data-fit": "" },
    table,
  ];
  const grid = long.length >= 2 && count <= GRID_COLUMNS;
  if (!grid && !prose.length) return wrapper;

  // As a grid, or a column on a phone, some browsers drop the table's semantics, so it states them.
  table[1].role = "table";
  for (const part of childrenOf(table).filter(isElement))
    if (part[0] !== "tr") part[1].role = "rowgroup";
  for (const row of rows) {
    row[1].role = "row";
    for (const cell of cellsOf(row))
      cell[1].role = cell[0] === "td" ? "cell" : row === head ? "columnheader" : "rowheader";
  }
  if (!grid) return wrapper;

  const share = shares(
    rows.map((row) => long.map((index) => lengthOf(cellsOf(row)[index] ?? ["td", {}]))),
  );
  const top = Math.max(...share);
  wrapper[1]["data-cols"] = String(count);
  long.forEach((index, at) => {
    wrapper[1][`data-w${index + 1}`] = String(
      Math.max(1, Math.round((WEIGHTS * share[at]!) / top)),
    );
  });
  const stacked = count - long.length + 1;
  if (!prose.length || long.length > STACK_ROWS || stacked > STACK_COLUMNS) return wrapper;

  // Side by side, each long column gets its share of what the short ones leave. The table stacks below the width where
  // the narrowest prose column would read only a few words a line.
  const fixed = sum(columns.map((column) => (column.short ? column.tight * 0.55 + 2 : 0)));
  const fold = fixed + READABLE / Math.min(...prose.map((index) => share[long.indexOf(index)]!));
  const threshold = FOLD_WIDTHS.reduce((best, value) =>
    Math.abs(value - fold) < Math.abs(best - fold) ? value : best,
  );

  // Stacked, the long columns take one column where the first was, and the others keep their order.
  const first = long[0]!;
  const folded = (index: number) =>
    long.filter((column) => column > first && column < index).length;
  wrapper[1]["data-stack"] = `${stacked}-${first + 1}`;
  wrapper[1]["data-fold"] = String(threshold);
  for (const row of rows)
    cellsOf(row).forEach((cell, index) => {
      const own = long.indexOf(index);
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
    else if (node[0] === "comments" || node[0] === "comments-render")
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
