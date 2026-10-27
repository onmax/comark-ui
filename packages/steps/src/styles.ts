import { theme } from "comark-zoom/theme";

/**
 * Steps down a line, each numbered in a circle beside its first line, on the shared `--comark-*` tokens. The numbers
 * are a CSS counter, so a step reads as a list item without the styles. The rules sit in the `comark` layer, so any
 * unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cs"),
  ".cs{margin:1.5rem 0;padding:0;list-style:none;counter-reset:cs-step;font-family:var(--_comark-font)}",
  ".cs-step{position:relative;padding-inline-start:2.75rem;padding-bottom:2rem;counter-increment:cs-step}",
  ".cs-step::before{content:counter(cs-step);position:absolute;inset-inline-start:0;top:0;display:grid;place-items:center;box-sizing:border-box;width:1.75rem;height:1.75rem;border:1px solid var(--_comark-border);border-radius:9999px;background:var(--_comark-accent);color:var(--_comark-foreground);font:600 .8125rem/1 var(--_comark-font);font-variant-numeric:tabular-nums}",
  // The line runs from under the number to the next step's.
  ".cs-step::after{content:'';position:absolute;inset-inline-start:calc(.875rem - .5px);top:2rem;bottom:.25rem;width:1px;background:var(--_comark-border)}",
  ".cs-step:last-child{padding-bottom:0}",
  ".cs-step:last-child::after{display:none}",
  // A page's own heading and list item margins would collapse out of the step and leave a gap the line can't cross, and
  // they are almost always unlayered, so only `!important` beats them. The gap between steps is their bottom padding.
  ".cs-step{margin-block:0!important}",
  // The renderer may put the styles first in the first step, so the trims skip a `style` or `script`.
  ".cs-step>:nth-child(1 of :not(style,script)){margin-top:0!important}",
  ".cs-step>:nth-last-child(1 of :not(style,script)){margin-bottom:0!important}",
  // A step's heading sits on the number's line, with what it says close under it.
  ".cs-step>:is(h1,h2,h3,h4,h5,h6,.cl-heading):nth-child(1 of :not(style,script)){margin-bottom:.5rem!important;line-height:1.75rem}",
  // comark-links wraps the heading in a flex row, so its margins no longer reach the step's first child.
  ".cs-step>.cl-heading:nth-child(1 of :not(style,script))>:is(h1,h2,h3,h4,h5,h6){margin-block:0!important;line-height:1.75rem}",
  ".cs-step>:is(h1,h2,h3,h4,h5,h6,.cl-heading):nth-child(1 of :not(style,script))+*{margin-top:0!important}",
  // comark-code wraps a block whose own margins would pass through the wrapper.
  ".cs-step>.ck:nth-last-child(1 of :not(style,script))>pre{margin-bottom:0!important}",
  ".cs-step>:is(h1,h2,h3,h4,h5,h6,.cl-heading):nth-child(1 of :not(style,script))+.ck>pre{margin-top:0!important}",
  "@media print{.cs-step{break-inside:avoid}}",
].join("")}}`;
