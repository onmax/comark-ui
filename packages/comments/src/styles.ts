import { caveat } from "comark-annotate/font";
import { theme } from "comark-zoom/theme";

// A speech bubble in a grey that reads on light and dark pages. It's a background image because the bubble has to
// stay a plain inline box: Chrome may break a line before any atomic inline, even right after a word joiner.
const icon = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.2' stroke-linejoin='round'%3E%3Cpath d='M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'/%3E%3C/svg%3E")`;
const parts = ".cr,.cr-sg,.cr-cm,.cr-bub,.cr-card";
const pen = '.cr-sg[data-mark="pen"]';
// Written once a document has a pen mark, since the font is about 32 KB.
export const fontCss = `@font-face{font-family:comark-caveat;src:url(data:font/woff2;base64,${caveat}) format("woff2");font-display:block}`;

/**
 * The marks, bubbles, and cards, on the shared `--comark-*` tokens. Override `--cr-ins`, `--cr-del`, and
 * `--cr-comment`. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(parts, "status", "shadow"),
  `:where(${parts}){--_cr-ins:var(--cr-ins,var(--_comark-success));--_cr-del:var(--cr-del,var(--_comark-danger));--_cr-comment:var(--cr-comment,#f5a524);--_cr-icon:var(--cr-icon,${icon})}`,
  `@media (prefers-color-scheme:dark){:where(${parts}){--_cr-comment:var(--cr-comment,#fbbf24)}}`,
  // What a screen reader says around a change, since <del> and <ins> alone are silent in most of them.
  ".cr-sg :is(del,ins)::before,.cr-sg :is(del,ins)::after{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}",
  '.cr-sg del::before{content:" [removed: "}.cr-sg ins::before{content:" [added: "}.cr-sg :is(del,ins)::after{content:"] "}',
  ".cr-sg,.cr-cm{border-radius:calc(var(--_comark-radius) - 6px);transition:box-shadow .12s}",
  ".cr-sg :is(del,ins){padding:.0625rem .1875rem;border-radius:calc(var(--_comark-radius) - 6px);-webkit-box-decoration-break:clone;box-decoration-break:clone}",
  ".cr-sg del{color:color-mix(in oklab,var(--_cr-del) 70%,var(--_comark-foreground));background:color-mix(in srgb,var(--_cr-del) 11%,transparent);text-decoration:line-through 1.5px color-mix(in srgb,var(--_cr-del) 75%,transparent)}",
  ".cr-sg ins{color:color-mix(in oklab,var(--_cr-ins) 60%,var(--_comark-foreground));background:color-mix(in srgb,var(--_cr-ins) 13%,transparent);text-decoration:none}",
  ".cr-sg del+ins{margin-left:.125rem}",
  // Pen: the new words are written above the old ones, starting where they start, so only their own line grows.
  `${pen}{position:relative;display:inline-block;padding-top:1.05em}`,
  ".cr-keep{white-space:nowrap}",
  `${pen} del{position:relative;padding:0;background:none;color:inherit;text-decoration:none}`,
  `${pen} .cr-strike{position:absolute;left:-.08em;top:50%;width:calc(100% + .16em);height:.7em;transform:translateY(-40%);overflow:visible;fill:none;stroke:var(--_cr-del);stroke-width:2.25;stroke-linecap:round}`,
  `${pen} .cr-strike path{vector-effect:non-scaling-stroke}`,
  `${pen} ins{position:absolute;left:0;top:-.05em;margin:0;padding:0;background:none;transform:rotate(-2.5deg);transform-origin:left bottom;white-space:nowrap;color:var(--_cr-del);font:400 1.5em/1 comark-caveat,cursive}`,
  // An insertion has nothing to sit above, so it hangs over a caret and the line keeps its width.
  `${pen}[data-kind="insert"] ins{transform:translateX(-50%) rotate(-2.5deg);transform-origin:center}`,
  `${pen} .cr-caret{display:inline-block;position:relative;width:0}`,
  `${pen} .cr-caret svg{position:absolute;left:-.32em;top:.18em;width:.64em;height:.5em;overflow:visible;fill:none;stroke:var(--_cr-del);stroke-width:2.25;stroke-linecap:round;stroke-linejoin:round}`,
  ".cr-cm{color:inherit;background:color-mix(in srgb,var(--_cr-comment) 22%,transparent);border-bottom:2px solid color-mix(in srgb,var(--_cr-comment) 80%,transparent);border-radius:calc(var(--_comark-radius) - 8px);padding:0 .0625rem}",
  // The bubble stays on its anchor's line: a plain inline box after a word joiner, with the icon as its background.
  ".cr-bub{display:inline;margin-left:.25em;padding:.25em .5em .25em 1.75em;vertical-align:.1em;border:1px solid var(--_comark-border);border-radius:9999px;background:var(--_comark-background) var(--_cr-icon) no-repeat .42em 50%/1em;color:var(--_comark-muted);font:600 .6875rem/1 var(--_comark-font);font-variant-numeric:tabular-nums;cursor:pointer;transition:color .12s,border-color .12s}",
  ".cr-bub:empty{padding-right:.3em}",
  ".cr-tg{position:absolute;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}",
  ".cr-tg:focus-visible+.cr-bub{outline:2px solid var(--_comark-ring);outline-offset:2px}",
  ".cr-tg:checked+.cr-bub,.cr-bub:hover,.cr-bub:has(+.cr-card:hover){color:var(--_comark-foreground);border-color:var(--_comark-ring)}",
  ":is(.cr-cm,.cr-sg):has(+.cr-tg:checked,+.cr-tg+.cr-bub:hover,+.cr-tg+.cr-bub+.cr-card:hover){box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-foreground) 12%,transparent)}",
  ".cr-card{display:none;box-sizing:border-box;padding:.5rem .75rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .8125rem/1.5 var(--_comark-font);text-align:left;text-indent:0;white-space:normal;transition:border-color .12s,box-shadow .12s}",
  ".cr-entry{display:block}.cr-entry+.cr-entry{margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--_comark-border)}",
  ".cr-entry b{margin-right:.375rem;font-weight:600}",
  ".cr-av{display:inline-block;overflow:hidden;width:1.125rem;height:1.125rem;margin-right:.375rem;border-radius:9999px;background:color-mix(in oklab,oklch(.7 .12 var(--cr-hue)) 30%,var(--_comark-background));color:color-mix(in oklab,oklch(.55 .14 var(--cr-hue)) 60%,var(--_comark-foreground));font:600 .5625rem/2 var(--_comark-font);text-align:center;vertical-align:calc(.722cap - .5625rem)}",
  // Centered on the name's capitals: the card's text is 1.444 times the avatar's, so its cap height is .722cap here.
  // overflow:hidden puts an initial's baseline at its bottom edge, where an image's is, so the offset moves both alike.
  // A ring keeps a white logo or a transparent photo apart from the card.
  "img.cr-av{display:inline-block;background:#fff;object-fit:cover;outline:1px solid color-mix(in srgb,var(--_comark-foreground) 12%,transparent);outline-offset:-1px}",
  // Narrow: a checked bubble opens its card as a block under the line.
  ".cr-tg:checked+.cr-bub+.cr-card{display:block;float:left;clear:both;width:100%;margin:.5rem 0}",
  // Wide: every block leaves a margin, and each card floats into it from its anchor's line. Crowded cards stack down.
  // The margin is !important so a page's own paragraph margins, which beat the layer, can't close it.
  ".cr{container:cr/inline-size;display:flow-root}",
  "@container cr (min-width:50rem){.cr>*{margin-right:19.5rem!important}.cr-card,.cr-tg:checked+.cr-bub+.cr-card{display:block;position:relative;float:right;clear:right;width:17.5rem;margin:0 -19.5rem .5rem 0}.cr-tg:checked+.cr-bub+.cr-card,.cr-bub:hover+.cr-card,.cr-card:hover{border-color:var(--_comark-ring);box-shadow:var(--_comark-shadow)}}",
  // Print's .6875rem text is 1.222 times the avatar's, so its cap height is .611cap there.
  "@media print{.cr>*{margin-right:12.5rem!important}.cr-card{display:block!important;float:right!important;clear:right;width:11.5rem!important;margin:0 -12.5rem .375rem 0!important;font-size:.6875rem;box-shadow:none!important}.cr-av{vertical-align:calc(.611cap - .5625rem)}.cr-bub{display:none}}",
].join("")}}`;
