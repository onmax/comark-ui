import { theme } from "comark-zoom/theme";

/**
 * The carousel styles. The script adds them to the page once. Theme the controls with the shared `--comark-*` tokens,
 * and set `--cc-gap`, `--cc-surface`, `--cc-padding`, and `--cc-button-size` on `.cc` or any ancestor. The rules sit in
 * the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cc"),
  ":where(.cc){--cc-columns:1}",
  ".cc{position:relative;margin:1.5rem 0;container-type:inline-size}",
  ".cc[data-carousel-columns='2']{--cc-columns:2}",
  ".cc[data-carousel-columns='3']{--cc-columns:3}",
  ".cc-track{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - (var(--cc-columns) - 1) * var(--cc-gap,1rem)) / var(--cc-columns));gap:var(--cc-gap,1rem);overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory}",
  // Without the script there are no arrows, so the scrollbar is how a mouse reaches the other slides.
  "[data-carousel-ready] .cc-track{scrollbar-width:none}",
  "[data-carousel-ready] .cc-track::-webkit-scrollbar{display:none}",
  // Every slide is a panel as tall as the tallest one, with its content at the top, so a slide's title stays put when
  // the next slide is taller. Only slides in a track: the zoomed copy stays bare.
  ".cc-track>.cc-slide{min-width:0;scroll-snap-align:start;align-content:start;padding:var(--cc-padding,1rem);border-radius:var(--_comark-radius);background:var(--cc-surface,color-mix(in srgb,var(--_comark-foreground) 4%,transparent))}",
  // A page's unlayered block margins would open a band of the slide's surface around its content, and comark-code's
  // wrapper passes its block's margins through, so the trims are `!important` and skip a `style` or `script`.
  ".cc-slide>:nth-child(1 of :not(style,script)),.cc-slide>.ck:nth-child(1 of :not(style,script))>pre{margin-top:0!important}",
  ".cc-slide>:nth-last-child(1 of :not(style,script)),.cc-slide>.ck:nth-last-child(1 of :not(style,script))>pre{margin-bottom:0!important}",
  // A slide that is one code block shows the block's own frame, not a second one around it.
  ".cc-track>.cc-slide:has(>:is(pre,.ck):nth-child(1 of :not(style,script)):nth-last-child(1 of :not(style,script))){padding:0;background:none}",
  ".cc-slide img{max-width:100%;height:auto}",
  // The parse plugin lifts an image, or a link around one, out of a paragraph of its own, so only an image that stands
  // alone is centered.
  ".cc-slide>img,.cc-slide>a>img{display:block;margin-inline:auto}",
  // The track clips anything drawn outside a slide, so the focus ring of a zoomable item sits inside its edge.
  ".cc-track [data-zoom]:focus-visible{outline-offset:-2px}",
  // Several columns need room; a narrow page shows one slide at a time, with less padding to spare its width.
  "@container (max-width:36rem){.cc-track{grid-auto-columns:100%}.cc-track>.cc-slide{padding:calc(var(--cc-padding,1rem) / 2)}}",
  // One quiet row under the slides, as in Embla's examples: where you are on the left, shadcn's outline icon buttons
  // on the right. It needs no gutter beside the slides, so it stays the same on a phone.
  ".cc-controls{display:none;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.75rem}",
  "[data-carousel-ready] .cc-controls{display:flex}",
  // Slides that all fit side by side need no controls, until a narrow page shows them one at a time.
  "@container (min-width:36.01rem){.cc[data-carousel-fits] .cc-controls{display:none!important}}",
  ".cc-count{color:var(--_comark-muted);font-size:.875rem;line-height:1.25rem;font-variant-numeric:tabular-nums}",
  ".cc-steps{display:flex;gap:.5rem}",
  ".cc-step{display:inline-grid;place-items:center;width:var(--cc-button-size,2rem);height:var(--cc-button-size,2rem);padding:0;border:1px solid var(--_comark-border);border-radius:999px;background:var(--_comark-background);color:var(--_comark-foreground);box-shadow:0 1px 2px rgb(0 0 0/.05);cursor:pointer;touch-action:manipulation;transition:background .15s,opacity .15s}",
  ".cc-step:hover:not([aria-disabled='true']){background:var(--_comark-accent)}",
  ".cc-step:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  // Not `disabled`: a button that disables under focus drops focus to the page, and the arrow keys with it.
  ".cc-step[aria-disabled='true']{opacity:.5;cursor:default}",
  ".cc-step svg{width:1rem;height:1rem}",
  ".cc:dir(rtl) .cc-step svg{scale:-1 1}",
  // A finger needs a bigger target than a pointer.
  "@media (pointer:coarse){.cc-step{width:max(var(--cc-button-size,2rem),2.5rem);height:max(var(--cc-button-size,2rem),2.5rem)}}",
].join("")}}`;
