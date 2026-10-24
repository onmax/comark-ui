import { theme } from "comark-zoom/theme";

// Tailwind's zinc, red, green, yellow, blue, purple, and cyan, in the order terminals number them, then their bright
// versions: darker shades on a light terminal, so white and yellow still read, and lighter ones on a dark one.
const light = [
  "#27272a",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#2563eb",
  "#9333ea",
  "#0891b2",
  "#71717a",
  "#52525b",
  "#ef4444",
  "#22c55e",
  "#d97706",
  "#3b82f6",
  "#a855f7",
  "#06b6d4",
  "#a1a1aa",
];
const dark = [
  "#27272a",
  "#ef4444",
  "#22c55e",
  "#eab308",
  "#3b82f6",
  "#a855f7",
  "#06b6d4",
  "#d4d4d8",
  "#71717a",
  "#f87171",
  "#4ade80",
  "#facc15",
  "#60a5fa",
  "#c084fc",
  "#22d3ee",
  "#fafafa",
];
const colors = (palette: string[]) => palette.map((color, n) => `--cca-${n}:${color}`).join(";");

/**
 * A recording's text in a terminal window in the style of shadcn/ui's code blocks: a muted surface with a border and
 * three dots, in the page's scheme, on the shared `--comark-*` tokens. Its 16 colors switch with the scheme, whether
 * the system or a `.light` or `.dark` class above sets it. Override `--cca-background`, `--cca-foreground`, and `--cca-0`
 * to `--cca-15` to change the terminal's colors. The rules sit in the `comark` layer, so any unlayered rule of the
 * host's wins, except the terminal's two colors: see below.
 */
export const css = `@layer comark{${[
  theme(".cca"),
  `:where(.cca){--cca-background:color-mix(in srgb,var(--_comark-accent) 60%,var(--_comark-background));--cca-foreground:var(--_comark-foreground);${colors(light)}}`,
  `@media (prefers-color-scheme:dark){:where(.cca){${colors(dark)}}}`,
  `:where(.light .cca){${colors(light)}}`,
  `:where(.dark .cca){${colors(dark)}}`,
  ".cca{margin:1.5rem 0;font-family:var(--_comark-font)}",
  ".cca figcaption{margin-bottom:.5rem;color:var(--_comark-muted);font-size:.875rem;line-height:1.25rem}",
  // Important inside a layer wins over a page's important `pre` background, which would put the program's colors on
  // the wrong ground. `--cca-background` is the way to change it.
  ".cca-term{padding:.875rem 1rem 1rem;overflow-x:auto;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--cca-background)!important;color:var(--cca-foreground)!important;font:.8125rem/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;tab-size:8}",
  // A page's own `pre` margin, almost always unlayered, would push the terminal away from its caption, and only
  // `!important` beats it.
  ".cca-term{margin:0!important}",
  // The window's three dots, in the muted color, above the first line.
  ".cca-term::before{content:'';display:block;width:2.5rem;height:.625rem;margin-bottom:.875rem;background:radial-gradient(circle closest-side,color-mix(in srgb,var(--_comark-muted) 45%,transparent) 96%,transparent) 0 0/.875rem .625rem repeat-x}",
  ...light.map((_, n) => `.cca-f${n}{color:var(--cca-${n})}.cca-b${n}{background:var(--cca-${n})}`),
  ".cca-fi{color:var(--cca-background)}.cca-bi{background:var(--cca-foreground)}",
  ".cca-bold{font-weight:700}.cca-dim{opacity:.6}.cca-italic{font-style:italic}",
  ".cca-underline{text-decoration:underline}.cca-strike{text-decoration:line-through}.cca-underline.cca-strike{text-decoration:underline line-through}",
  "@media print{.cca-term{-webkit-print-color-adjust:exact;print-color-adjust:exact;white-space:pre-wrap}}",
].join("")}}`;
