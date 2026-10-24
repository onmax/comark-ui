import { theme } from "comark-zoom/theme";

/**
 * A QR code as an inline block on a bordered tile, on the shared `--comark-*` tokens. The modules are black on white
 * whatever the page's scheme, since a phone's camera reads dark on light best. Override `--cqr-size` to resize it. The
 * rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cqr"),
  ":where(.cqr){--cqr-size:8rem}",
  ".cqr{display:inline-block;width:var(--cqr-size);max-width:100%;vertical-align:middle;line-height:0}",
  // Capped, so a large radius can't round off the quiet zone into the finder patterns.
  ".cqr svg{display:block;box-sizing:border-box;width:100%;height:auto;border:1px solid var(--_comark-border);border-radius:min(calc(var(--_comark-radius) - 4px),.5rem);background:#fff;color:#000;shape-rendering:crispEdges}",
  "@media print{.cqr svg{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
].join("")}}${
  // The code fills its box, so a page's own `svg` margin would push it out. Keep this host-overridable.
  ".cqr svg{margin:0}"
}`;
