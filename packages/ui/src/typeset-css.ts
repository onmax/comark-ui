import { theme } from "comark-zoom/theme";
import { shikiDark } from "../../../shared/shiki.ts";

// T3 Code's surface grain (pingdotgg/t3code apps/web/src/index.css): fractal noise at 3.5% opacity in a 256px tile.
const grain = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`;

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** The widths, in em, a wide table's `data-width` rounds up to (table-layout.ts). The wide block's maximum caps the last. */
export const TABLE_WIDTHS = [48, 52, 56, 60, 64, 68, 72, 80, 88, 96];
/** The container widths, in em, below which a table stacks its prose (`data-fold`). */
export const FOLD_WIDTHS = range(9, 24).map((step) => step * 4);
/** A table gets a grid of its own columns with at most this many, and its long columns' weights go up to this many steps. */
export const GRID_COLUMNS = 8;
export const WEIGHTS = 12;
/** A table stacks with at most this many columns, and this many prose columns under one another. */
export const STACK_COLUMNS = 6;
export const STACK_ROWS = 3;

// Comments add a document wrapper; nested component/list tables remain outside this scope.
const documentRoot = ":is(:scope, :scope > .cr)";
const table = `${documentRoot} > div:is([data-width], [data-fit])`;
// A grid of the table's rows, each a subgrid, so its columns line up from row to row.
const grid = (selector: string) => `
  ${selector} { display: grid; }
  ${selector} > :is(thead, tbody, tfoot) { display: contents; }
  ${selector} > * > tr { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; }`;
const cells = `${table} > table > * > tr >`;
const proseTable = `${table}[data-prose] > table`;
// As specific as the stacked rules, so the phone's, which come last, win.
const card = `${proseTable} > * > tr > :is(td, th, [data-col][data-row])`;

/*
 * The tables table-layout.ts marks. A wide one sits in a div that grows like any wide block, up to its own width, past
 * the wide blocks' 72rem unless the page sets --comark-wide-max. One with long columns is a grid: short columns as
 * narrow as their cells allow, the long ones sharing the rest by weight. Below its data-fold width, it stacks: the
 * prose columns move into one, each cell placed by data-col and data-row. On a phone, each row is one column.
 */
const tableRules = [
  `:scope :where(td[data-short]:not([data-short="chips"]), th[data-short]) { white-space: nowrap; }`,
  `${table} { overflow-x: auto; margin-block: var(--_ty-flow) 0; container-type: inline-size; }`,
  `${table} > table { margin: 0; }`,
  `${table}:is([data-wide], [data-cols]) > table { display: table; width: 100%; max-width: none; overflow: visible; }`,
  `${table}[data-wide] { --_ty-wide: max(100%, min(var(--comark-wide-width), var(--comark-wide-max, var(--comark-wide-width)), 100% + var(--_ty-start) + var(--_ty-end))); }`,
  ...TABLE_WIDTHS.map(
    (width) => `${table}[data-width="${width}"] { --comark-wide-width: ${width}em; }`,
  ),
  grid(`${table}[data-cols] > table`),
  ...range(2, GRID_COLUMNS).map(
    (columns) =>
      `${table}[data-cols="${columns}"] > table { grid-template-columns: ${range(1, columns)
        .map((column) => `var(--_ty-c${column}, min-content)`)
        .join(" ")}; }`,
  ),
  ...range(1, GRID_COLUMNS).flatMap((column) =>
    range(1, WEIGHTS).map(
      (weight) => `[data-w${column}="${weight}"] { --_ty-c${column}: ${weight}fr; }`,
    ),
  ),
  ...range(2, STACK_COLUMNS).flatMap((columns) =>
    range(1, columns).map(
      (prose) =>
        `${table}[data-stack="${columns}-${prose}"] { --_ty-stacked: ${range(1, columns)
          .map((column) => (column === prose ? "minmax(8em, 1fr)" : "min-content"))
          .join(" ")}; }`,
    ),
  ),
  // Side by side, --_ty-at is auto and every cell takes the next column, and --_ty-side is 1. Stacked, --_ty-at is
  // unset, so each cell takes its own column and row, and --_ty-side is 0: the lines of a row close up, and all but the
  // first are muted.
  `${table}[data-cols] > table { --_ty-at: auto; --_ty-side: 1; }`,
  // A long column with a narrow share still fits a word or a chip: a chip outside a short column may break anywhere.
  `${table}[data-cols] > table > * > tr > :not([data-short]) { min-width: var(--_ty-cell-min, 8em); }`,
  ...range(1, STACK_COLUMNS).map(
    (column) => `${cells} [data-col="${column}"] { grid-column: var(--_ty-at, ${column}); }`,
  ),
  `${cells} [data-col]:not([data-row]) { grid-row: var(--_ty-at, 1 / span ${STACK_ROWS}); }`,
  ...range(1, STACK_ROWS).map(
    (row) => `${cells} [data-row="${row}"] { grid-row: var(--_ty-at, ${row}); }`,
  ),
  `${table} > table > thead > tr > [data-row="1"] { padding-block-end: calc(0.25em + var(--_ty-side) * 0.4em); }`,
  `${table} > table > tbody > tr > [data-row="1"] { padding-block-end: calc(0.25em + var(--_ty-side) * 0.5em); }`,
  `${cells} [data-row]:not([data-row="1"]) { padding-block-start: calc(var(--_ty-side) * 0.75em); border-block-start-width: calc(var(--_ty-side) * 1px); color: color-mix(in oklab, currentColor calc(var(--_ty-side) * 100%), var(--_ty-muted)); }`,
  `${table} > table > thead > tr > [data-row]:not([data-row="1"]) { padding-block-start: calc(var(--_ty-side) * 0.65em); }`,
  ...FOLD_WIDTHS.map(
    (width) =>
      `@container (max-width: ${width - 0.01}em) { ${table}[data-fold="${width}"] > table { grid-template-columns: var(--_ty-stacked); --_ty-at: initial; --_ty-side: 0; --_ty-cell-min: 0px; } }`,
  ),
  // On a phone even the short columns leave the prose no room, so each row becomes one column: the cells in order, the
  // header kept for screen readers only. Last, so it wins over the rules above.
  `@container (max-width: 31.99em) {
    ${grid(proseTable)}
    ${proseTable} { grid-template-columns: minmax(0, 1fr); --_ty-cell-min: 0px; }
    ${card} { grid-column: 1; grid-row: auto; padding: 0 0 0.25em; border-block-start: 0; white-space: normal; }
    ${card}:first-child { padding-block-start: 0.75em; border-block-start: 1px solid var(--_ty-rule); }
    ${card}:last-child { padding-block-end: 0.75em; }
    ${proseTable} > thead > tr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  }`,
].join("\n");

// Whatever an author or a block marks to keep its own look.
const own = ":where(.not-typeset, [data-not-typeset], .not-typeset *, [data-not-typeset] *)";

/*
 * shadcn/typeset (https://ui.shadcn.com/docs/typeset, MIT), on the shared `--comark-*` tokens. Its `--typeset-*`
 * variables stay, read with fallbacks rather than set, so a value on any ancestor or `:root` wins.
 */
const rules = `
:scope {
  --_ty-flow: var(--typeset-flow, 1.25em);
  --_ty-muted: var(--_comark-muted);
  --_ty-rule: var(--_comark-border);
  --_ty-surface: var(--_comark-accent);
  --_ty-radius: calc(var(--_comark-radius) * 0.8);
  --_ty-mono: var(--comark-font-mono, var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
  font-family: var(--_comark-font);
  font-size: calc(var(--typeset-size, 1em) * 1.125);
  line-height: var(--typeset-leading, 1.75);
  color: var(--_comark-foreground);
  overflow-wrap: break-word;
  /* T3 Code's grain, painted into the document's own background rather than a fixed overlay, which the compositor
     would blend again on every animated frame. It sits over any background color the page gives this element. */
  background-image: var(--comark-grain, ${grain});
  background-repeat: repeat;
  background-size: var(--comark-grain-size, 256px 256px);
  @media (min-width: 48rem), print {
    font-size: var(--typeset-size, 1em);
  }
}

:scope *:not(${own}) {
  &:where(p) { margin-block: var(--_ty-flow) 0; }

  &:where(h1, h2, h3, h4, h5, h6) {
    color: var(--_comark-foreground);
    font-family: var(--comark-font-heading, var(--font-heading, inherit));
    font-weight: 600;
    margin-block-end: 0;
  }
  &:where(h1) { font-size: 1.75em; line-height: 1.3; margin-block-start: var(--_ty-flow); }
  &:where(h2) { font-size: 1.25em; line-height: 1.4; margin-block-start: calc(var(--_ty-flow) * 1.4); }
  &:where(h3) { font-size: 1.125em; line-height: 1.45; margin-block-start: var(--_ty-flow); }
  &:where(h4) { font-size: 1em; line-height: 1.5; margin-block-start: var(--_ty-flow); }
  &:where(h5) {
    font-size: 0.875em; line-height: 1.5; font-weight: 500; color: var(--_ty-muted);
    margin-block-start: calc(var(--_ty-flow) / 0.875);
  }
  &:where(h6) {
    font-size: 0.8125em; line-height: 1.5; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--_ty-muted); margin-block-start: calc(var(--_ty-flow) / 0.8125);
  }
  &:where([id]) { scroll-margin-block-start: var(--_ty-flow); }
  /* Headings own the space below them. */
  &:where(h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + *) { margin-block-start: 1em; }
  &:where(:is(h1, h2, h3, h4) code) { font-size: 0.9em; }

  &:where(a) {
    color: inherit;
    font-weight: 500;
    text-decoration-line: underline;
    text-decoration-color: color-mix(in oklab, currentColor 30%, transparent);
  }
  &:where(a:hover) { text-decoration-color: currentColor; }
  &:where(a:focus-visible) { outline: 2px solid var(--_comark-ring); outline-offset: 2px; border-radius: 0.125em; }
  &:where(:is(h1, h2, h3, h4, h5, h6) a) { font-weight: inherit; }

  &:where(strong, b) { font-weight: 600; }
  &:where(mark) {
    background-color: color-mix(in oklab, oklch(0.86 0.17 95) 40%, transparent);
    color: inherit; padding: 0.05em 0.15em; border-radius: 0.2em;
  }
  &:where(abbr[title]) {
    text-decoration-line: underline; text-decoration-style: dotted; text-underline-offset: 0.2em; cursor: help;
  }
  &:where(del, s) { color: var(--_ty-muted); text-decoration-line: line-through; }
  &:where(sup, sub) { font-size: 0.75em; line-height: 0; position: relative; vertical-align: baseline; }
  &:where(sup) { top: -0.5em; }
  &:where(sub) { bottom: -0.25em; }
  &:where(sup a) { text-decoration-line: none; font-weight: 500; }

  &:where(ul) { list-style-type: disc; }
  &:where(ol) { list-style-type: decimal; }
  &:where(ul ul) { list-style-type: circle; }
  &:where(ul ul ul) { list-style-type: square; }
  &:where(ol[type="a" i]) { list-style-type: lower-alpha; }
  &:where(ol[type="i" i]) { list-style-type: lower-roman; }
  &:where(ol[type="A" s]) { list-style-type: upper-alpha; }
  &:where(ol[type="I" s]) { list-style-type: upper-roman; }
  &:where(ul, ol) { margin-block: var(--_ty-flow) 0; padding-inline-start: 1.5em; }
  &:where(li) { margin-block-start: 0.5em; padding-inline-start: 0.4em; }
  &:where(li > p, li > ul, li > ol) { margin-block-start: 0.5em; }
  &:where(ul > li, ol > li)::marker { color: var(--_ty-muted); }
  &:where(ul.contains-task-list) { list-style-type: none; padding-inline-start: 0.25em; }
  &:where(li.task-list-item > input[type="checkbox"]) {
    margin-inline-end: 0.5em; vertical-align: -0.1em; accent-color: var(--_comark-primary);
  }

  &:where(details) { margin-block: var(--_ty-flow) 0; }
  &:where(summary) { cursor: pointer; font-weight: 500; }
  &:where(summary)::marker { color: var(--_ty-muted); }

  &:where(kbd) {
    font-family: inherit; font-size: 0.85em; font-weight: 500;
    border: 1px solid var(--_ty-rule); border-block-end-width: 2px; border-radius: 0.35em; padding: 0.0625em 0.35em;
  }

  &:where(dl) { margin-block: var(--_ty-flow) 0; }
  &:where(dt) { font-weight: 500; margin-block-start: 1em; }
  &:where(dt + dt) { margin-block-start: 0.25em; }
  &:where(dd) { margin-block-start: 0.25em; margin-inline-start: 0; padding-inline-start: 1em; color: var(--_ty-muted); }

  &:where(:not(pre) > code) {
    background-color: var(--_ty-surface); font-family: var(--_ty-mono); font-size: 0.85em;
    border-radius: 0.35em; padding: 0.125em 0.3em;
  }
  &:where(pre) {
    background-color: var(--_ty-surface); font-family: var(--_ty-mono); font-size: 0.875em; line-height: 1.5;
    tab-size: 2; direction: ltr; border-radius: var(--_ty-radius); padding: 0.75em 1em; overflow-x: auto;
    margin-block: calc(var(--_ty-flow) / 0.875) 0;
  }
  &:where(pre code) { background-color: transparent; font-family: inherit; font-size: inherit; padding: 0; border-radius: 0; }

  &:where(blockquote) {
    border-inline-start: 2px solid var(--_ty-rule); padding-inline-start: 1em; margin-block: var(--_ty-flow) 0;
    margin-inline: 0;
  }

  &:where(hr) { border: 0; border-block-start: 1px solid var(--_ty-rule); margin-block: calc(var(--_ty-flow) * 2.4) 0; }
  &:where(hr + h1, hr + h2, hr + h3, hr + h4) { margin-block-start: var(--_ty-flow); }

  /* comark-footnotes opens the section with its own rule and heading, so the section adds none. */
  &:where(.footnotes, [data-footnotes]) {
    margin-block-start: calc(var(--_ty-flow) * 2); font-size: 0.875em; color: var(--_ty-muted);
  }
  &:where(.footnotes > hr:first-child) { margin-block-start: 0; }
  &:where(.footnote-ref a, .footnote-backref) { text-decoration-line: none; }

  &:where(math[display="block"]) {
    margin-block: var(--_ty-flow) 0; overflow-x: auto; overflow-y: hidden; padding-block: 0.25em;
  }

  &:where(img, video) { border-radius: var(--_ty-radius); max-width: 100%; height: auto; margin-block: var(--_ty-flow) 0; }
  /* An image in a line of text sits on the text; a block's top margin would push it below. */
  &:where(:is(p, li, td, th, a) img) { margin-block-start: 0; }
  &:where(figure) { margin-block: var(--_ty-flow) 0; margin-inline: 0; }
  &:where(figcaption, caption) {
    color: var(--_ty-muted); font-size: 0.875em; text-align: center; margin-block-start: calc(0.75em / 0.875);
  }
  &:where(caption) { caption-side: bottom; }

  /* A table scrolls inside the column when it can't fit, as on GitHub, and its headers wrap like its cells. Separators
     sit on cells, not on the last row, so appending a row keeps them. */
  &:where(table) {
    display: block; width: max-content; max-width: 100%; overflow-x: auto; font-size: 1em; line-height: 1.5;
    font-variant-numeric: tabular-nums; border-collapse: separate; border-spacing: 0;
    border-block-end: 1px solid var(--_ty-rule); margin-block: var(--_ty-flow) 0;
  }
  &:where(thead th) { font-weight: 500; text-align: start; padding: 0.65em 1em; }
  &:where(:is(tbody, tfoot) :is(td, th)) {
    padding: 0.75em 1em; text-align: start; vertical-align: top; border-block-start: 1px solid var(--_ty-rule);
  }
  &:where(tbody th, tfoot th) { font-weight: 500; }
  &:where(th:first-child, td:first-child) { padding-inline-start: 0; }
  &:where(th[align="center"], td[align="center"]) { text-align: center; }
  &:where(th[align="right"], td[align="right"]) { text-align: end; }

  /* Blocks inside list items keep the list's tighter rhythm. */
  &:where(li > blockquote, li > table, li > figure) { margin-block-start: 0.5em; }
  &:where(li > pre) { margin-block-start: calc(0.5em / 0.875); }

  @media print {
    &:where(pre, table, blockquote, figure) { break-inside: avoid; }
    &:where(h1, h2, h3, h4) { break-after: avoid; }
  }
  /* Forced colors strips the code background, so give it a border. */
  @media (forced-colors: active) {
    &:where(:not(pre) > code) { border: 1px solid; }
  }
}

/* A block marked data-wide, such as a before/after comparison or a diagram wider than the text, grows past the column
   into the room the page gives it on each side, --comark-wide-start and --comark-wide-end, up to its own width
   (--comark-wide-width) and --comark-wide-max. It stays centered on the column while both sides have room, and moves
   toward the side that has more when one doesn't. Without room set, it keeps to the column. Only the document's own
   blocks grow, not one inside a list or tabs. A heading right above a comparison grows with it, so it starts where
   Before does and reads as its title. comark-links may wrap the heading, and the comparison's styles may sit between them. */
${documentRoot} > [data-wide],
:scope > :is(h2, h3, h4, .cl-heading:has(> :is(h2, h3, h4))):has(+ .ca-compare, + style + .ca-compare) {
  /* Room a page works out from the window can come out negative on a phone, where the column fills it: none, then. */
  --_ty-start: max(0px, var(--comark-wide-start, 0px));
  --_ty-end: max(0px, var(--comark-wide-end, 0px));
  --_ty-wide: max(100%, min(var(--comark-wide-width, 100vw), var(--comark-wide-max, 72rem), 100% + var(--_ty-start) + var(--_ty-end)));
  width: var(--_ty-wide);
  margin-inline: clamp(-1 * var(--_ty-start), (100% - var(--_ty-wide)) / 2, 100% + var(--_ty-end) - var(--_ty-wide)) 0;
}

${tableRules}

/* The first child adds no space above. Last, so it wins ties. The typeset styles themselves come first. */
:scope > :where(:nth-child(1 of :not(style, script))):not(${own}),
:scope > :where(:nth-child(1 of :not(style, script))) > :where(:first-child):not(${own}),
:scope :where(
  li > :first-child, blockquote > :first-child, td > :first-child, th > :first-child, dd > :first-child,
  figure > :first-child, figure > picture > img
):not(${own}) {
  margin-block-start: 0;
}
`;

/**
 * The text around the blocks: headings, paragraphs, lists, tables, code, and quotes. `@scope` with no selector styles
 * the element the `<style>` sits in, so the document carries its own look into any page and leaves the rest of the
 * page alone. The `typeset` layer sits inside `comark`, so every block's own rules win over it, and any plain rule of
 * the page wins over both.
 */
export const typesetCss =
  `@layer comark{@layer typeset{@scope{${theme(":scope", "primary")}${rules}${shikiDark}}}}`
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/ ?([{};,>(]) ?/g, "$1")
    // A colon followed by a space only ends a property's name; a selector's colon never has one after it.
    .replace(/: /g, ":")
    .trim();

/**
 * The same styles for a page's own stylesheet, scoped to every element that matches `selector`, for Comark content
 * that isn't a rendered document, such as a rich-text editor. `comark-ui/typeset.css` is this with `.comark-typeset`.
 * The rules are the same string as `typesetCss`, so the two can't drift.
 */
export const typesetStylesheet = (selector = ".comark-typeset") =>
  typesetCss.replace("@scope{", `@scope (${selector}){`);
