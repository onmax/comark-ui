import { theme } from "comark-zoom/theme";

// The parts that hold an author's Markdown. A page's own paragraph and list margins are almost always unlayered, so
// only `!important` keeps their first and last blocks flush with the part's edges.
const slots = [
  ".cqz-prompt",
  ".cqz-label",
  ".cqz-rationale",
  ".cqz-after",
  ".cqz-hint-body",
  ".cqz-explain",
  ".cqz-answer",
  ".cqz-key-label",
].join(",");
const right = "[data-state='correct'],[data-state='revealed']";
const graded = `:is(${right})`;
const ring = "0 0 0 3px color-mix(in oklab,var(--_comark-ring) 50%,transparent)";

/**
 * A question, poll, or recall card in the style of shadcn/ui's Card and RadioGroup, on the shared `--comark-*` tokens:
 * hairline borders, neutral surfaces, and color only where a state needs it. Override `--cqz-primary`,
 * `--cqz-correct`, `--cqz-incorrect`, `--cqz-bar`, `--cqz-bar-strong`, and `--cqz-surface`. The rules sit in the
 * `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cqz"),
  // Resolved into private variables, so a `--cqz-*` set on `:root` or any ancestor reaches every block.
  ":where(.cqz){--_cqz-primary:var(--cqz-primary,var(--ui-primary,var(--primary,var(--_comark-foreground))));--_cqz-on-primary:var(--cqz-primary-foreground,var(--primary-foreground,var(--_comark-background)));--_cqz-correct:var(--cqz-correct,var(--ui-success,var(--success,oklch(.62 .14 155))));--_cqz-incorrect:var(--cqz-incorrect,var(--ui-error,var(--destructive,oklch(.577 .245 27.325))));--_cqz-bar:var(--cqz-bar,color-mix(in oklab,var(--_comark-foreground) 6%,transparent));--_cqz-bar-strong:var(--cqz-bar-strong,color-mix(in oklab,var(--_cqz-primary) 14%,transparent));--_cqz-surface:var(--cqz-surface,color-mix(in oklab,var(--_comark-foreground) 2%,var(--_comark-background)));--_cqz-ease:cubic-bezier(.23,1,.32,1)}",
  "@media (prefers-color-scheme:dark){:where(.cqz){--_cqz-incorrect:var(--cqz-incorrect,var(--ui-error,var(--destructive,oklch(.704 .191 22.216))))}}",
  ".cqz{position:relative;box-sizing:border-box;margin:1.5rem 0;padding:1.25rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) + 2px);background:var(--_cqz-surface);color:var(--_comark-foreground);font:400 .875rem/1.25rem var(--_comark-font);container-type:inline-size}",
  ".cqz *,.cqz *::before,.cqz *::after{box-sizing:border-box}",
  ".cqz [hidden]{display:none}",
  `:is(${slots})>:first-child{margin-top:0!important}`,
  `:is(${slots})>:last-child{margin-bottom:0!important}`,
  ".cqz-icon{flex:none;width:1rem;height:1rem}",

  // The prompt, with the number hanging before its first line.
  ".cqz-head{display:flex;align-items:baseline;gap:.375rem}",
  ".cqz-number{flex:none;color:var(--_comark-muted);font-size:1rem;line-height:1.5rem;font-weight:600;font-variant-numeric:tabular-nums}",
  ".cqz-prompt{flex:1;min-width:0;font-size:1rem;line-height:1.5rem;font-weight:600;text-wrap:balance;overflow-wrap:break-word}",
  ".cqz-prompt code{font-weight:inherit}",

  // The options: native radios and checkboxes, each row a label the size of a 40px target or more.
  ".cqz-options{display:grid;gap:.5rem;min-inline-size:0;margin:1rem 0 0;padding:0;border:0}",
  ".cqz-option{position:relative;isolation:isolate;overflow:hidden;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-background);transition:border-color .15s var(--_cqz-ease),background-color .15s var(--_cqz-ease),box-shadow .15s var(--_cqz-ease)}",
  ".cqz-choice{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;grid-template-areas:'indicator label verdict percent';align-items:start;column-gap:.75rem;min-height:2.5rem;margin:0;padding:.625rem .75rem;cursor:pointer;-webkit-tap-highlight-color:transparent}",
  ".cqz-option:has(.cqz-input:is(:disabled,[aria-disabled='true'])) .cqz-choice{cursor:default}",
  ".cqz-option:has(.cqz-input:disabled) .cqz-label{color:var(--_comark-muted)}",
  ".cqz-indicator{grid-area:indicator;position:relative;display:grid;width:1rem;height:1rem;margin-top:.125rem;color:var(--_cqz-primary)}",
  ".cqz-indicator>*{grid-area:1/1}",
  ".cqz-input{appearance:none;width:1rem;height:1rem;margin:0;border:1px solid color-mix(in oklab,var(--_comark-foreground) 18%,var(--_comark-border));border-radius:9999px;background:var(--_comark-background);box-shadow:0 1px 2px rgb(0 0 0/.05);outline:none;cursor:inherit;transition:border-color .15s var(--_cqz-ease),background-color .15s var(--_cqz-ease),opacity .15s var(--_cqz-ease)}",
  ".cqz-input[type='checkbox']{border-radius:4px}",
  ".cqz-input:checked{border-color:var(--_cqz-primary)}",
  ".cqz-input[type='checkbox']:checked{background:var(--_cqz-primary)}",
  ".cqz-input:disabled{opacity:.5}",
  ".cqz-mark{width:1rem;height:1rem;opacity:0;pointer-events:none;transition:opacity .15s var(--_cqz-ease)}",
  ".cqz-input:checked~.cqz-mark{opacity:1}",
  ".cqz-input[type='checkbox']~.cqz-mark{color:var(--_cqz-on-primary)}",
  ".cqz-indicator .cqz-icon{opacity:0;pointer-events:none}",
  ".cqz-label{grid-area:label;min-width:0;text-wrap:pretty;overflow-wrap:break-word}",
  ".cqz-label img{max-width:100%;height:auto}",
  ".cqz-verdict{grid-area:verdict;display:none;font-size:.75rem;line-height:1.25rem;font-weight:500;white-space:nowrap}",
  ".cqz-percent{grid-area:percent;display:none;min-width:2.25rem;font-weight:500;text-align:end;font-variant-numeric:tabular-nums;white-space:nowrap}",
  ".cqz-rationale{padding:0 .75rem .625rem 2.5rem;margin-top:-.125rem;color:var(--_comark-muted);text-wrap:pretty;overflow-wrap:break-word}",
  ".cqz-after{margin-top:1rem;text-wrap:pretty}",

  // States: an icon and a word, a border, and a light tint, never the color alone.
  ".cqz-option[data-state='idle']:has(.cqz-input:not(:disabled,[aria-disabled='true'])):hover{background:color-mix(in oklab,var(--_comark-accent) 60%,var(--_comark-background))}",
  ".cqz-option[data-state='selected']{border-color:var(--_cqz-primary);background:color-mix(in oklab,var(--_cqz-primary) 4%,var(--_comark-background))}",
  `.cqz-option${graded}{border-color:color-mix(in oklab,var(--_cqz-correct) 50%,var(--_comark-border));background:color-mix(in oklab,var(--_cqz-correct) 8%,var(--_comark-background))}`,
  ".cqz-option[data-state='incorrect']{border-color:color-mix(in oklab,var(--_cqz-incorrect) 50%,var(--_comark-border));background:color-mix(in oklab,var(--_cqz-incorrect) 8%,var(--_comark-background))}",
  `.cqz-option:is(${right},[data-state='incorrect'],[data-state='voted']) :is(.cqz-input,.cqz-mark){opacity:0}`,
  // With results showing, only the marked rows keep an indicator, so a short bar never runs into an empty radio. The
  // indicator keeps its space, so the labels stay put.
  ".cqz[data-results] .cqz-option :is(.cqz-input,.cqz-mark){opacity:0}",
  `.cqz-option${graded} .cqz-yes{opacity:1;color:var(--_cqz-correct)}`,
  ".cqz-option[data-state='incorrect'] .cqz-no{opacity:1;color:var(--_cqz-incorrect)}",
  ".cqz-option[data-state='voted'] .cqz-yes{opacity:1}",
  `.cqz-option:is(${right},[data-state='incorrect']) .cqz-verdict:not(:empty){display:block}`,
  `.cqz-option${graded} .cqz-verdict{color:color-mix(in oklab,var(--_cqz-correct) 75%,var(--_comark-foreground))}`,
  ".cqz-option[data-state='incorrect'] .cqz-verdict{color:color-mix(in oklab,var(--_cqz-incorrect) 80%,var(--_comark-foreground))}",
  ".cqz-option:has(.cqz-input:focus-visible){border-color:var(--_comark-ring);box-shadow:" +
    ring +
    "}",

  // Results: each row fills to its share like a poll, the leading row and the reader's own choice a shade deeper.
  ".cqz-bar{position:absolute;inset:0;z-index:-1;background:var(--_cqz-bar);transform:scaleX(0);transform-origin:left center;transition:transform .25s var(--_cqz-ease)}",
  ".cqz-bar:dir(rtl){transform-origin:right center}",
  ".cqz[data-results] .cqz-bar{transform:scaleX(var(--_cqz-share,0))}",
  ".cqz[data-results][data-quiz-kind='poll'] .cqz-option:is([data-leading],[data-state='voted']) .cqz-bar{background:var(--_cqz-bar-strong)}",
  // A graded row already wears its state, so its share fills in a deeper shade of that color.
  `.cqz-option${graded} .cqz-bar{background:color-mix(in oklab,var(--_cqz-correct) 14%,transparent)}`,
  ".cqz-option[data-state='incorrect'] .cqz-bar{background:color-mix(in oklab,var(--_cqz-incorrect) 14%,transparent)}",
  ".cqz[data-results] .cqz-percent{display:block}",
  ".cqz[data-results][data-quiz-kind='poll'] .cqz-option{background:var(--_comark-background)}",

  // Buttons follow shadcn/ui's: default, outline, ghost, and link, 32px tall with a 40px target.
  ".cqz-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-top:1rem}",
  // Left with only the screen reader's message, the row folds away but stays in the accessibility tree.
  ".cqz-actions[data-empty]{height:0;margin-top:0;overflow:hidden}",
  ".cqz-button{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:.375rem;height:2rem;margin:0;padding:0 .75rem;border:1px solid transparent;border-radius:calc(var(--_comark-radius) - 2px);background:none;color:var(--_comark-foreground);font:500 .875rem/1.25rem var(--_comark-font);white-space:nowrap;cursor:pointer;user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .16s var(--_cqz-ease),background-color .15s var(--_cqz-ease),border-color .15s var(--_cqz-ease),color .15s var(--_cqz-ease),box-shadow .15s var(--_cqz-ease)}",
  ".cqz-button::before{content:'';position:absolute;inset:-.25rem}",
  ".cqz-button:active{transform:scale(.96)}",
  ".cqz-button[data-variant='default']{background:var(--_cqz-primary);color:var(--_cqz-on-primary);box-shadow:0 1px 2px rgb(0 0 0/.05)}",
  ".cqz-button[data-variant='default']:hover{background:color-mix(in oklab,var(--_cqz-primary) 90%,var(--_comark-background))}",
  ".cqz-button[data-variant='outline']{border-color:var(--_comark-border);background:var(--_comark-background);box-shadow:0 1px 2px rgb(0 0 0/.05)}",
  ".cqz-button:is([data-variant='outline'],[data-variant='ghost']):hover{background:var(--_comark-accent)}",
  ".cqz-button[data-variant='ghost']{padding:0 .625rem;color:var(--_comark-muted)}",
  ".cqz-button[data-variant='ghost']:hover{color:var(--_comark-foreground)}",
  ".cqz-button[data-variant='link']{height:1.25rem;padding:0;border:0;color:var(--_comark-muted);text-decoration:underline;text-decoration-color:color-mix(in oklab,currentColor 40%,transparent);text-underline-offset:4px}",
  ".cqz-button[data-variant='link']:hover{color:var(--_comark-foreground)}",
  ".cqz-button[data-variant='link']::before{inset:-.625rem -.25rem}",
  // After the variants, whose own border and shadow would otherwise hide the ring.
  ".cqz-button:focus-visible{outline:none;border-color:var(--_comark-ring);box-shadow:" +
    ring +
    "}",
  ".cqz-button[aria-pressed='true']{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  ".cqz-button .cqz-check{display:none;width:.875rem;height:.875rem}",
  ".cqz-button[aria-pressed='true'] .cqz-check{display:block}",
  ".cqz-hint-toggle{margin-inline-start:auto}",
  ".cqz-hint-toggle[aria-expanded='true']{color:var(--_comark-foreground)}",
  ".cqz-status{display:inline-flex;align-items:center;gap:.375rem;min-height:1.25rem;font-weight:500}",
  ".cqz[data-state='correct'] .cqz-status{color:color-mix(in oklab,var(--_cqz-correct) 75%,var(--_comark-foreground))}",
  ".cqz[data-state='incorrect'] .cqz-status{color:color-mix(in oklab,var(--_cqz-incorrect) 80%,var(--_comark-foreground))}",
  ".cqz[data-state='correct'] .cqz-status .cqz-icon{color:var(--_cqz-correct)}",
  ".cqz[data-state='incorrect'] .cqz-status .cqz-icon{color:var(--_cqz-incorrect)}",
  ".cqz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}",

  // Slots revealed by state.
  ".cqz-hint{display:flex;gap:.5rem;margin-top:.75rem;color:var(--_comark-muted);text-wrap:pretty}",
  ".cqz-hint>.cqz-icon{margin-top:.125rem}",
  ".cqz-hint-body{min-width:0;flex:1}",
  ".cqz-explain{margin-top:1rem;text-wrap:pretty;overflow-wrap:break-word}",
  ".cqz-footer{display:flex;flex-wrap:wrap;align-items:center;column-gap:.75rem;row-gap:.25rem;margin-top:.75rem;color:var(--_comark-muted);font-variant-numeric:tabular-nums}",
  ".cqz-footer:not(:has(>:not(:empty,[hidden]))){display:none}",
  ".cqz-total{color:var(--_comark-foreground);font-weight:500}",
  // An empty status keeps its place in the accessibility tree without taking a gap in the row.
  ".cqz-total:empty{position:absolute}",
  ".cqz-count{color:var(--_comark-muted);font-weight:400;font-variant-numeric:tabular-nums}",
  ".cqz-said+.cqz-count::before{content:'·';margin-inline-end:.375rem}",
  ".cqz:is([data-state='idle'],[data-state='selected']) .cqz-status{color:var(--_comark-muted)}",

  // A recall card's answer stays under a blur, out of reach of screen readers and the tab order, until it's shown.
  // The padding gives the blur room inside the box, and the negative margin cancels it, so the text sits where it would
  // and the blur fades out instead of stopping at a hard edge.
  ".cqz-reveal{margin:-.25rem -.75rem -.75rem;padding:.75rem;text-wrap:pretty;overflow-wrap:break-word;outline:none;transition:filter .2s var(--_cqz-ease)}",
  ".cqz-reveal[aria-hidden='true']{max-height:6.5rem;overflow:hidden;filter:blur(6px);user-select:none;-webkit-mask-image:linear-gradient(#000 calc(100% - 1.25rem),transparent);mask-image:linear-gradient(#000 calc(100% - 1.25rem),transparent)}",
  ".cqz-reveal:focus-visible{border-radius:calc(var(--_comark-radius) - 4px);box-shadow:" +
    ring +
    "}",

  // Without the script: the answer and the hint in native disclosures, the controls that need the script hidden.
  ":where(html:not([data-quiz-ready])) :is(.cqz-actions,.cqz-reveal,.cqz-footer .cqz-button){display:none}",
  ":where(html[data-quiz-ready]) .cqz-disclosure{display:none}",
  ".cqz-disclosure{margin-top:1rem}",
  ".cqz-disclosure+.cqz-disclosure{margin-top:.5rem}",
  ".cqz-disclosure>summary{display:inline-flex;list-style:none}",
  ".cqz-disclosure>summary::-webkit-details-marker{display:none}",
  ".cqz-disclosure>summary:focus-visible{outline:none;border-color:var(--_comark-ring);box-shadow:" +
    ring +
    "}",
  ".cqz-disclosure[open]>summary{margin-bottom:.75rem}",
  ".cqz-disclosure>.cqz-hint{margin-top:0}",
  ".cqz-key{display:grid;gap:.75rem}",
  ".cqz-key-item{display:grid;gap:.25rem}",
  ".cqz-key-item .cqz-rationale{padding:0;margin:0}",
  ".cqz-key-verdict{display:inline-flex;align-items:center;gap:.375rem;color:color-mix(in oklab,var(--_cqz-correct) 75%,var(--_comark-foreground));font-size:.75rem;font-weight:500}",
  ".cqz-key-verdict .cqz-icon{color:var(--_cqz-correct)}",
  ".cqz-key-label{font-weight:500}",
  ".cqz-key+.cqz-explain{margin-top:1rem}",

  // Restored answers and results arrive at once, with no motion; so does everything for a reader who asks for less.
  ".cqz[data-instant],.cqz[data-instant] *{transition:none}",
  "@media (prefers-reduced-motion:reduce){.cqz-bar{transition:none}.cqz-button{transition-property:background-color,border-color,color,box-shadow}.cqz-button:active{transform:none}}",
  "@container (max-width:30rem){.cqz-choice{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:'indicator label percent' 'indicator verdict percent'}.cqz-verdict{justify-self:start}}",
  "@media (max-width:40rem){.cqz{padding:1rem}}",
  "@media print{.cqz{break-inside:avoid}}",
].join("")}}`;
