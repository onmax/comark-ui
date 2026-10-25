import { theme } from "comark-zoom/theme";

/**
 * A card in the style of shadcn/ui's, with the counts as badges tinted green, red (shadcn/ui's `--destructive` when the
 * page has it), or muted, and each failure as a disclosure with its stack, on the shared `--comark-*` tokens. Override
 * `--ctr-pass`, `--ctr-fail`, and `--ctr-skip`. The rules sit in the `comark` layer, so any unlayered rule of the host's
 * wins.
 */
export const css = `@layer comark{${[
  theme(".ctr"),
  ":where(.ctr){--ctr-pass:#259f56;--ctr-fail:var(--destructive,#ee3533);--ctr-skip:var(--_comark-muted)}",
  "@media (prefers-color-scheme:dark){:where(.ctr){--ctr-pass:#59d38c;--ctr-fail:var(--destructive,#fd736d)}}",
  ".ctr{margin:1.5rem 0;overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font-family:var(--_comark-font)}",
  ".ctr-summary{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0;padding:.75rem 1rem;font-size:.875rem;line-height:1.25rem;font-variant-numeric:tabular-nums}",
  ".ctr-title{margin-inline-end:auto;font-weight:500}",
  // A badge per count, as shadcn/ui draws a status: a dot and the count on a tint of its color.
  ".ctr-count{--_ctr:var(--ctr-pass);display:inline-flex;align-items:center;gap:.375rem;padding:.125rem .5rem;border-radius:calc(var(--_comark-radius) - 4px);background:color-mix(in srgb,var(--_ctr) 12%,transparent);color:color-mix(in oklab,var(--_ctr) 80%,var(--_comark-foreground));font-size:.75rem;font-weight:500;line-height:1rem;white-space:nowrap}",
  ".ctr-count[data-kind='failed']{--_ctr:var(--ctr-fail)}",
  ".ctr-count[data-kind='skipped']{--_ctr:var(--ctr-skip)}",
  ".ctr-count::before{content:'';width:.375rem;height:.375rem;border-radius:999px;background:var(--_ctr)}",
  ".ctr-time{color:var(--_comark-muted);font-size:.75rem}",
  ".ctr-failure{border-top:1px solid var(--_comark-border)}",
  ".ctr-failure>summary{padding:.5rem 1rem;font-size:.875rem;font-weight:500;cursor:pointer;overflow-wrap:anywhere}",
  ".ctr-failure>summary:hover{background:var(--_comark-accent)}",
  ".ctr-failure>summary:focus-visible{outline:none;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--_comark-ring) 60%,transparent)}",
  ".ctr-message{margin:0!important;padding:0 1rem .5rem;color:var(--ctr-fail);font-size:.875rem;white-space:pre-wrap;overflow-wrap:anywhere}",
  // A page's plain `pre` margins are unlayered and would run the stack to the card's edges, so only `!important` keeps it
  // inset under the message.
  ".ctr-stack{margin:0 1rem 1rem!important;overflow-x:auto;font-size:.8125rem}",
  "@media print{.ctr-failure:not([open])>:not(summary){display:block}}",
].join("")}}`;
