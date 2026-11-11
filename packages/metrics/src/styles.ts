import { theme } from "comark-zoom/theme";

/**
 * Deltas colored green when better and red when worse (shadcn/ui's `--destructive` when the page has it), a progress
 * bar in the primary color, a stats table with its numbers aligned, and stat tiles as one strip of figures that wraps
 * to the width, on the shared `--comark-*` tokens. Override `--cmt-better`, `--cmt-worse`, and `--cmt-bar`. The rules
 * sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cmt-delta,.cmt-progress,.cmt-stats,.cmt-tiles", "status", "primary"),
  ":where(.cmt-delta){--cmt-better:var(--_comark-success);--cmt-worse:var(--_comark-danger)}",
  // shadcn/ui's Progress: the primary color on a track of itself at a fifth.
  ":where(.cmt-progress){--cmt-bar:var(--_comark-primary)}",
  ".cmt-delta{font-variant-numeric:tabular-nums;white-space:nowrap}",
  ".cmt-from{color:var(--_comark-muted)}",
  ".cmt-change{font-weight:500}",
  ".cmt-delta[data-verdict='better'] .cmt-change{color:var(--cmt-better)}",
  ".cmt-delta[data-verdict='worse'] .cmt-change{color:var(--cmt-worse)}",
  ".cmt-delta[data-verdict='neutral'] .cmt-change{color:var(--_comark-muted)}",
  ".cmt-progress{display:inline-flex;align-items:center;gap:.5rem;vertical-align:middle;font-variant-numeric:tabular-nums}",
  ".cmt-progress progress{appearance:none;width:8rem;height:.5rem;overflow:hidden;border:0;border-radius:9999px;background:color-mix(in srgb,var(--cmt-bar) 20%,transparent);color:var(--cmt-bar)}",
  ".cmt-progress progress::-webkit-progress-bar{background:color-mix(in srgb,var(--cmt-bar) 20%,transparent)}",
  ".cmt-progress progress::-webkit-progress-value{border-radius:9999px;background:var(--cmt-bar)}",
  ".cmt-progress progress::-moz-progress-bar{border-radius:9999px;background:var(--cmt-bar)}",
  ".cmt-label,.cmt-percent{color:var(--_comark-muted);font-size:.875em}",
  ".cmt-stats :is(td,th):not(:first-child){text-align:end;font-variant-numeric:tabular-nums}",
  // One strip of figures, as a dashboard's header: hairlines between the tiles, the number over its name. The strip's
  // color shows through the 1px gaps as the lines, and the tiles grow to fill a row that wraps, so no gap is left.
  ".cmt-tiles{display:flex;flex-wrap:wrap;gap:1px;margin:1.5rem 0;overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-border);font-family:var(--_comark-font)}",
  ".cmt-tile{box-sizing:border-box;display:flex;flex:1 1 8rem;flex-direction:column;align-items:flex-start;gap:.125rem;min-width:0;padding:.75rem 1rem;background:var(--_comark-background)}",
  ".cmt-tile>*{margin:0}",
  ".cmt-tile>dt{order:1;color:var(--_comark-muted);font-size:.75rem;font-weight:400;line-height:1rem}",
  ".cmt-value{color:var(--_comark-foreground);font-size:1.5rem;font-weight:500;line-height:1.2;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}",
  // The change's color is its verdict's, so the pill tints itself with it.
  ".cmt-tile>dd:not(.cmt-value){order:2;margin-top:.25rem}",
  ".cmt-tile .cmt-change{display:inline-block;padding:.125rem .5rem;border-radius:9999px;background:color-mix(in srgb,currentColor 12%,transparent);font-size:.75rem}",
].join("")}}`;
