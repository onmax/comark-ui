import { theme } from "comark-zoom/theme";

/**
 * The heading links and the new-tab warning, on the shared `--comark-*` tokens. A heading's `#` sits after its text,
 * shown on hover or focus where the reader can hover. The rules sit in the `comark` layer, so any unlayered rule of the
 * host's wins.
 */
export const css = `@layer comark{${[
  theme(".cl-heading"),
  // Flex keeps the heading a block, with its own margins and font, and puts the link on its first line's baseline.
  ".cl-heading{display:flex;align-items:baseline;gap:.375em}",
  ".cl-heading>:first-child{min-width:0}",
  // Prose styles space whatever follows a heading; this link shares its line instead.
  ".cl-anchor{margin-block:0}",
  ".cl-anchor{flex:none;color:var(--_comark-muted);font-weight:500;text-decoration:none;user-select:none;-webkit-user-select:none;border-radius:calc(var(--_comark-radius) - 6px)}",
  ".cl-anchor:hover{color:var(--_comark-foreground)}",
  ".cl-anchor:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  "@media (hover:hover){.cl-anchor{opacity:0;transition:opacity .15s ease}.cl-heading:hover>.cl-anchor,.cl-anchor:focus-visible{opacity:1}}",
  // An inline block, so the link's underline doesn't run under the arrow.
  ".cl-icon{display:inline-block;margin-inline-start:.125em;font-size:.875em;line-height:1;text-decoration:none}",
  ".cl-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}",
].join("")}}`;
