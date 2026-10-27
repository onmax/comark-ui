import { theme } from "comark-zoom/theme";

/**
 * The magic move styles. The script adds them to the page once. Theme the controls with the shared `--comark-*`
 * tokens, and set `--cmv-gap` and `--cmv-button-size` on `.cmv` or any ancestor. The rules sit in the `comark` layer,
 * so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cmv"),
  ".cmv{margin:1.5rem 0}",
  // Without the script every step reads in turn, each under its label.
  ".cmv-stage{position:relative;display:grid;gap:var(--cmv-gap,1rem)}",
  "[data-magic-move-ready] .cmv-step[data-inactive]{display:none}",
  ".cmv-stage[data-moving]{overflow:clip}",
  ".cmv-label{margin-bottom:.5rem;color:var(--_comark-muted);font:500 .875rem/1.25rem var(--_comark-font)}",
  // A page's unlayered block margins would push the code away from its label, and comark-code's wrapper passes its
  // block's margins through, so the trims are `!important`.
  ".cmv-step>pre,.cmv-step>.ck,.cmv-step>.ck>pre{margin-top:0!important;margin-bottom:0!important}",
  // Transforms skip inline boxes, so each piece the script cuts is an inline block.
  ".cmv-t{display:inline-block}",
  ".cmv-ghost{position:absolute;white-space:pre;pointer-events:none}",
  ".cmv-controls{display:none;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.75rem}",
  "[data-magic-move-ready] .cmv-controls{display:flex}",
  ".cmv-count{color:var(--_comark-muted);font-size:.875rem;line-height:1.25rem;font-variant-numeric:tabular-nums}",
  ".cmv-steps{display:flex;gap:.5rem}",
  ".cmv-button{display:inline-grid;place-items:center;width:var(--cmv-button-size,2rem);height:var(--cmv-button-size,2rem);padding:0;border:1px solid var(--_comark-border);border-radius:999px;background:var(--_comark-background);color:var(--_comark-foreground);box-shadow:0 1px 2px rgb(0 0 0/.05);cursor:pointer;touch-action:manipulation;transition:background .15s,opacity .15s}",
  ".cmv-button:hover:not([aria-disabled='true']){background:var(--_comark-accent)}",
  ".cmv-button:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  // Not `disabled`: a button that disables under focus drops focus to the page, and the arrow keys with it.
  ".cmv-button[aria-disabled='true']{opacity:.5;cursor:default}",
  ".cmv-button svg{width:1rem;height:1rem}",
  ".cmv:dir(rtl) .cmv-button svg{scale:-1 1}",
  "@media (pointer:coarse){.cmv-button{width:max(var(--cmv-button-size,2rem),2.5rem);height:max(var(--cmv-button-size,2rem),2.5rem)}}",
].join("")}}`;
