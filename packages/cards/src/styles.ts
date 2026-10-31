import { theme } from "comark-zoom/theme";

/**
 * Cards in the style of shadcn/ui's Card, two to a row in a group and one when the group is narrower than 36rem, and
 * columns from `::columns`, on the shared `--comark-*` tokens. The group is a size container, so a group in a narrow
 * column stacks whatever the screen's width. A card's color tints its icon and, on a link card, its hovered border; the
 * `soft` variant washes the card in it, and `subtle` its border too. Each color reads Nuxt UI's `--ui-*` variable when
 * the page has it, then `--ccr-*`. Primary and error fall back to shadcn/ui's `--primary` and `--destructive`, and
 * primary then to the foreground, so a card is neutral like the other plugins until the page has a brand color. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".ccr,.ccr-group,.ccr-columns", "status"),
  ":where(.ccr){--ccr-primary:var(--ui-primary,var(--primary,var(--_comark-foreground)));--ccr-secondary:var(--ui-secondary,var(--_comark-info));--ccr-success:var(--_comark-success);--ccr-info:var(--_comark-info);--ccr-warning:var(--_comark-warning);--ccr-error:var(--_comark-danger);--ccr-neutral:var(--_comark-foreground)}",
  ".ccr-group,.ccr-columns{display:grid;gap:1rem;margin:1.5rem 0;container-type:inline-size}",
  ".ccr-group{grid-template-columns:repeat(2,minmax(0,1fr))}",
  ...[2, 3, 4, 5, 6].map(
    (cols) =>
      `.ccr-columns[data-cols='${cols}']{grid-template-columns:repeat(${cols},minmax(0,1fr))}`,
  ),
  // A grid can't query its own width, but its cells can: in a narrow group each one takes the whole row.
  "@container (width<36rem){.ccr-group>*,.ccr-columns>*{grid-column:1/-1}}",
  ".ccr-group>.ccr{margin:0}",
  ".ccr-column>:first-child{margin-top:0}",
  ".ccr-column>:last-child{margin-bottom:0}",
  ".ccr{--ccr:var(--ccr-primary);position:relative;margin:1.5rem 0;padding:1.25rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) + 2px);background:var(--_comark-background);color:var(--_comark-muted);font:400 .875rem/1.375rem var(--_comark-font);transition:background-color .15s,border-color .15s}",
  ...["secondary", "success", "info", "warning", "error", "neutral"].map(
    (color) => `.ccr[data-color='${color}']{--ccr:var(--ccr-${color})}`,
  ),
  ".ccr[data-variant='soft'],.ccr[data-variant='subtle']{background:color-mix(in srgb,var(--ccr) 10%,var(--_comark-background))}",
  ".ccr[data-variant='soft']{border-color:transparent}",
  ".ccr[data-variant='subtle']{border-color:color-mix(in srgb,var(--ccr) 30%,var(--_comark-background))}",
  ".ccr>:last-child{margin-bottom:0}",
  ".ccr>.ci{--comark-icon-size:1.25rem;display:block;margin-bottom:.75rem;color:var(--ccr)}",
  ".ccr-title{margin:0 0 .25rem;color:var(--_comark-foreground);font-size:.9375rem;font-weight:600;line-height:1.375rem;text-wrap:balance}",
  ".ccr-title+*{margin-top:0}",
  // The link covers the card, so a click anywhere opens it; links in the card's text stay on top.
  ".ccr-link{position:absolute;inset:0;z-index:0;border-radius:inherit}",
  ".ccr-link:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".ccr :is(a,button):not(.ccr-link){position:relative;z-index:1}",
  ".ccr:has(>.ccr-link):hover{border-color:color-mix(in srgb,var(--ccr) 50%,var(--_comark-border));background:color-mix(in srgb,var(--_comark-accent) 50%,var(--_comark-background))}",
  ".ccr[data-variant='soft']:has(>.ccr-link):hover{border-color:transparent}",
  ".ccr[data-variant='subtle']:has(>.ccr-link):hover{border-color:color-mix(in srgb,var(--ccr) 30%,var(--_comark-background))}",
  ".ccr[data-variant='soft']:has(>.ccr-link):hover,.ccr[data-variant='subtle']:has(>.ccr-link):hover{background:color-mix(in srgb,var(--ccr) 16%,var(--_comark-background))}",
  ".ccr-external{position:absolute;top:1rem;inset-inline-end:1rem;width:1rem;height:1rem;color:var(--_comark-muted)}",
  ".ccr:dir(rtl) .ccr-external{scale:-1 1}",
  "@media print{.ccr{break-inside:avoid}.ccr-external{display:none}}",
].join("")}}`;
