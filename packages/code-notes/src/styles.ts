import { theme } from "comark-zoom/theme";

/**
 * Round numbered markers at the ends of lines and before each note, as a soft tint of shadcn/ui's `--primary` when the
 * page has it, or of the foreground otherwise, with the number in that color, on the shared `--comark-*` tokens.
 * Override `--cn-marker` and `--cn-marker-text`. The number is drawn by CSS, so copying the code never takes it along.
 * The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cn-marker,.cn-notes"),
  ":where(.cn-marker){--cn-marker:var(--primary,var(--_comark-foreground));--cn-marker-text:var(--cn-marker)}",
  ".cn-marker{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:1.25rem;height:1.25rem;margin-inline-start:.5rem;padding:0 .3rem;border-radius:9999px;background:color-mix(in srgb,var(--cn-marker) 10%,var(--_comark-background));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cn-marker) 22%,transparent);font:600 .6875rem/1 var(--_comark-font);font-variant-numeric:tabular-nums;vertical-align:.0625rem;user-select:none;transition:background-color .15s}",
  // A marker is a link, and a page's plain `a` rules would color its number like the page's links, on the marker's fill.
  ".cn-marker{color:var(--cn-marker-text)!important;text-decoration:none!important;border:0!important}",
  ".cn-marker::after{content:attr(data-note)}",
  "a.cn-marker:hover{background:color-mix(in srgb,var(--cn-marker) 18%,var(--_comark-background))}",
  "a.cn-marker:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cn-marker:target{box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 60%,transparent)}",
  // Following a marker either way tints its line: the target when a note links back, the focused marker on a click. The
  // tint is a border image past the line's ends, which the block clips, so the lines keep their layout.
  ".line:has(>.cn-marker:is(:target,:focus)){border-image:conic-gradient(color-mix(in srgb,var(--cn-marker,var(--primary,currentColor)) 14%,transparent) 0 0) fill 0//.25em 100vw}",
  ".cn-notes{margin:.75rem 0 1.5rem}",
  // A page's plain `ol` and `p` rules would indent the notes past the code and push a note's text below its marker.
  ".cn-notes{padding:0!important;list-style:none!important}",
  ".cn-notes>li{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:baseline;gap:.625rem;margin:.375rem 0;padding:.125rem .375rem;border-radius:calc(var(--_comark-radius) - 4px)}",
  ".cn-notes>li>.cn-marker{margin:0}",
  ".cn-notes>li>div>:first-child{margin-top:0!important}.cn-notes>li>div>:last-child{margin-bottom:0!important}",
  ".cn-notes>li:target{background:var(--_comark-accent)}",
].join("")}}`;
