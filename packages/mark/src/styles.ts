import { theme } from "comark-zoom/theme";

/**
 * A highlight tinted amber like comark-critic's, so the two read as one mark, and a superscript that doesn't open a gap
 * in its line. Override `--cmk-mark`. The rules sit in the `comark` layer, so any unlayered rule of the host's wins, and
 * in `:where()`, since the components also class the `mark` and `sup` other plugins write, such as comark-sources'
 * citations, whose own rules should win.
 */
export const css = `@layer comark{${[
  theme(".cmk-mark"),
  // Resolved into a private variable, so a `--cmk-mark` set on `:root` or any ancestor reaches the mark.
  ":where(.cmk-mark){--_cmk-mark:var(--cmk-mark,#f5b400)}",
  "@media (prefers-color-scheme:dark){:where(.cmk-mark){--_cmk-mark:var(--cmk-mark,#f5c84b)}}",
  // The text keeps its own color, so the tint reads on light and dark pages alike, and a mark that wraps keeps its
  // tint and corners on every line.
  ":where(.cmk-mark){padding:0 .125em;border-radius:calc(var(--_comark-radius) - 6px);background:color-mix(in srgb,var(--_cmk-mark) 30%,transparent);color:inherit;-webkit-box-decoration-break:clone;box-decoration-break:clone;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  // Forced colors would paint the tint over with the page's background, so the system's own highlight takes its place.
  "@media (forced-colors:active){:where(.cmk-mark){background:Mark;color:MarkText}}",
  // Raised by position, not `vertical-align`, so the line keeps its height.
  ":where(.cmk-sup){position:relative;top:-.5em;font-size:.75em;line-height:0;vertical-align:baseline}",
].join("")}}`;
