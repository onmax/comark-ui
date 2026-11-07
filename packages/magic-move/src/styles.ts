import { theme } from "comark-zoom/theme";

/**
 * The magic move styles: a code group whose tabs are the steps, on the shared `--comark-*` tokens, with `--cmv-surface`
 * and `--cmv-gap` of its own. The script adds them to the page once. The rules sit in the `comark` layer, so any
 * unlayered rule of the host's wins, except the one after it that joins each step's code block to the header.
 */
export const css = `@layer comark{${[
  theme(".cmv"),
  ".cmv{margin:1.5rem 0}",
  // Without the script every step reads in turn under a caption with its label, and the tabs that couldn't switch
  // them hide.
  // comark-code measures its buttons; their space stays outside the scrolling strip.
  ".cmv{position:relative;--ck-header:calc(2.5rem - 1px)}",
  "[data-magic-move-ready] .cmv::before{content:'';position:absolute;inset:0 0 auto;height:calc(var(--ck-header) + 1px);border-radius:var(--_comark-radius) var(--_comark-radius) 0 0;background:var(--cmv-surface,color-mix(in srgb,var(--_comark-accent) 50%,transparent));box-shadow:inset 0 0 0 1px var(--_comark-border);pointer-events:none}",
  ".cmv-list{display:none;box-sizing:border-box;width:calc(100% - var(--ck-controls,3.75rem));gap:2px;padding:.375rem;overflow-x:auto;scrollbar-width:none;border-radius:var(--_comark-radius) var(--_comark-radius) 0 0}",
  ".cmv-list::-webkit-scrollbar{display:none}",
  ".cmv-list,.cmv-caption{background:var(--cmv-surface,color-mix(in srgb,var(--_comark-accent) 50%,transparent));box-shadow:inset 0 0 0 1px var(--_comark-border)}",
  ".cmv-list{background:none;box-shadow:none}",
  "[data-magic-move-ready] .cmv-list{display:flex}",
  "[data-magic-move-ready] .cmv-caption,[data-magic-move-ready] .cmv-step[data-inactive]{display:none}",
  ".cmv-tab{display:inline-flex;flex:none;align-items:center;padding:.25rem .625rem;border:0;border-radius:calc(var(--_comark-radius) - 2px);background:none;color:var(--_comark-muted);font:500 .8125rem/1.25rem var(--_comark-font);white-space:nowrap;cursor:pointer;touch-action:manipulation;transition:color .15s,background-color .15s}",
  ".cmv-tab:hover{color:var(--_comark-foreground)}",
  // Forced colors drop the surface, and the transparent outline shows instead.
  ".cmv-tab[aria-selected='true']{color:var(--_comark-foreground);background:var(--_comark-background);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--_comark-border),var(--_comark-foreground) 8%);outline:1px solid transparent;outline-offset:-1px}",
  // On a dark page the strip is lighter than the page, so the open tab rises with a lighter surface, as in comark-tabs.
  // `min(1, …)` stands in for `calc()`, as there.
  "@supports (color:oklch(from red l c h)){.cmv-tab[aria-selected='true']{background:oklch(from var(--_comark-background) min(1, l + .14 * clamp(0, (.5 - l) * 100, 1)) c h)}}",
  // The strip scrolls, so it clips whatever reaches past its padding: a tab's ring stays inside the tab.
  ".cmv-tab:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:-2px}",
  ".cmv-step:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:2px}",
  ".cmv-stage{position:relative;display:grid;gap:var(--cmv-gap,1rem)}",
  "[data-magic-move-ready] .cmv-stage{margin-top:-1px}",
  // The clip keeps the step's buttons, which sit in the header above the stage.
  ".cmv-stage[data-moving]{clip-path:inset(calc(-1 * var(--ck-header)) 0 0)}",
  ".cmv-caption{margin-bottom:-1px;padding:.625rem 1rem;border-radius:var(--_comark-radius) var(--_comark-radius) 0 0;color:var(--_comark-muted);font:500 .8125rem/1.25rem var(--_comark-font)}",
  // Transforms skip inline boxes, so each piece the script cuts is an inline block.
  ".cmv-t{display:inline-block}",
  ".cmv-ghost{position:absolute;white-space:pre;pointer-events:none}",
  "@media (pointer:coarse){.cmv-tab{padding-block:.5rem}[data-magic-move-ready] .cmv{--ck-header:calc(3rem - 1px)}}",
].join("")}}${
  // The host styles its code blocks with plain rules, which beat any layered one. comark-code wraps each block in `.ck`.
  ".cmv-step>pre,.cmv-step>.ck,.cmv-step>.ck>pre{margin:0}.cmv-step>pre,.cmv-step>.ck>pre{border-radius:0 0 var(--_comark-radius) var(--_comark-radius)}"
}`;
