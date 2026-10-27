import { theme } from "comark-zoom/theme";

// T3 Code's surface grain (pingdotgg/t3code apps/web/src/index.css): fractal noise at 3.5% opacity in a 256px tile.
const grain = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`;

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
    margin-inline-end: 0.5em; vertical-align: -0.1em; accent-color: var(--ui-primary, var(--primary, currentColor));
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
  &:where(p img) { margin-block-start: 0; }
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

/* Code highlighted with a light and a dark theme follows the page into dark mode, as the tokens do: a .dark class
   above it, or the system's dark mode on a page with no .light class. Only spans that carry a dark color switch. */
.shiki:where(.dark *) span[style*="--shiki-dark:"] { color: var(--shiki-dark) !important; }
@media (prefers-color-scheme: dark) {
  .shiki:not(:where(.light *)) span[style*="--shiki-dark:"] { color: var(--shiki-dark) !important; }
}

/* A block marked data-wide, such as a before/after comparison or a diagram wider than the text, grows past the column
   into the room the page gives it on each side, --comark-wide-start and --comark-wide-end, up to its own width
   (--comark-wide-width) and --comark-wide-max. It stays centered on the column while both sides have room, and moves
   toward the side that has more when one doesn't. Without room set, it keeps to the column. Only the document's own
   blocks grow, not one inside a list or tabs. */
:scope > [data-wide] {
  --_ty-start: var(--comark-wide-start, 0px);
  --_ty-end: var(--comark-wide-end, 0px);
  --_ty-wide: max(100%, min(var(--comark-wide-width, 100vw), var(--comark-wide-max, 72rem), 100% + var(--_ty-start) + var(--_ty-end)));
  width: var(--_ty-wide);
  margin-inline: clamp(-1 * var(--_ty-start), (100% - var(--_ty-wide)) / 2, 100% + var(--_ty-end) - var(--_ty-wide)) 0;
}

/* The first child adds no space above. Last, so it wins ties. */
:scope > :where(:first-child):not(${own}),
:scope > :where(:first-child) > :where(:first-child):not(${own}),
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
export const typesetCss = `@layer comark{@layer typeset{@scope{${theme(":scope")}${rules}}}}`
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/ ?([{};,>(]) ?/g, "$1")
  // A colon followed by a space only ends a property's name; a selector's colon never has one after it.
  .replace(/: /g, ":")
  .trim();
