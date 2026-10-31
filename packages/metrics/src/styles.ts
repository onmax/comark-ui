import { theme } from "comark-zoom/theme";

/**
 * Deltas colored green when better and red when worse (shadcn/ui's `--destructive` when the page has it), a progress
 * bar in the primary color, a stats table with its numbers aligned, and stat tiles like shadcn/ui's Card that wrap
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
  ".cmt-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr));gap:.75rem;margin:1.5rem 0;font-family:var(--_comark-font)}",
  ".cmt-tile{display:flex;flex-direction:column;align-items:flex-start;gap:.25rem;padding:1rem 1.25rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) + 2px);background:var(--_comark-background)}",
  ".cmt-tile>*{margin:0}",
  ".cmt-tile>dt{color:var(--_comark-muted);font-size:.875rem;font-weight:500}",
  ".cmt-value{color:var(--_comark-foreground);font-size:1.875rem;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}",
  // The change's color is its verdict's, so the pill tints itself with it.
  ".cmt-tile .cmt-change{display:inline-block;padding:.125rem .5rem;border-radius:9999px;background:color-mix(in srgb,currentColor 12%,transparent);font-size:.75rem}",
].join("")}}`;
