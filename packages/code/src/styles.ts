import { css as icons } from "comark-icon/client";
import { theme } from "comark-zoom/theme";

// Lucide's chevrons-up-down, drawn as a mask in the text's color.
const chevrons = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>',
)}")`;
const lines = ".ck[data-code-lines]";
const light = "--ck-red:#ee3533;--ck-green:#259f56;--ck-yellow:#d49b00";
const dark = "--ck-red:#fd736d;--ck-green:#59d38c;--ck-yellow:#f5c84b";
// In a comark-tabs code group the tab names the block, so a terminal there draws no window.
const terminal = ".ck[data-code-frame=terminal]:not([data-tabs-code] .ck)";

/**
 * The header's styles, on the shared `--comark-*` tokens, with `--ck-inset` and `--ck-button-size` for how far the
 * buttons sit from the block's top right corner and how big they are, and `--ck-title-font` for the title. The script adds them to the page once. The rules sit in the
 * `comark` layer, so any unlayered rule of the host's wins, except the two after it that make room for the header and
 * wrap the lines.
 */
export const css = `${icons}@layer comark{${[
  theme(".ck"),
  ".ck>pre{border-radius:var(--_comark-radius)}",
  // No padding, border, or new formatting context, so the block's own margins collapse through the wrapper and the
  // header's top edge is the block's.
  ".ck{position:relative;--_ck-size:var(--ck-button-size,1.5rem);--_ck-inset:var(--ck-inset,.375rem);--_ck-bar:calc(var(--_ck-size) + 2 * var(--_ck-inset))}",
  // The header sits on the block's own background, in room the block makes above its first line, so it never covers
  // the code.
  ".ck-bar{position:absolute;inset:0 0 auto;display:flex;align-items:center;justify-content:flex-end;gap:.125rem;height:var(--_ck-bar);padding:var(--_ck-inset) var(--_ck-inset) 0 .75rem;box-sizing:border-box;user-select:none}",
  ".ck-title{min-width:0;margin-right:auto;overflow:hidden;color:color-mix(in srgb,var(--_comark-foreground) 72%,transparent);font:.6875rem/1 var(--ck-title-font,ui-monospace,SFMono-Regular,Menlo,monospace);text-overflow:ellipsis;white-space:nowrap}",
  ".ck-bar>button{display:inline-flex;align-items:center;justify-content:center;gap:.25rem;min-width:var(--_ck-size);height:var(--_ck-size);margin:0;padding:0;border:1px solid transparent;border-radius:calc(var(--_comark-radius) - 2px);background:transparent;color:var(--_comark-muted);font:500 .75rem/1 var(--_comark-font);position:relative;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background-color .15s ease,color .15s ease;visibility:hidden}",
  "[data-code-ready] .ck-bar>button{visibility:visible}",
  // Only an icon-only action carries `aria-label`.
  ".ck-bar>.ck-action:not([aria-label]){padding:0 .5rem}",
  ".ck-bar>.ck-action:not([aria-label]):has(.ci){padding-left:.375rem}",
  "@media (hover:hover){.ck-bar>button:hover{background:var(--_comark-accent);color:var(--_comark-foreground)}}",
  ".ck-wrap[aria-pressed='true']{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  "@media (prefers-reduced-motion:no-preference){.ck-bar>button{transition:background-color .15s ease,color .15s ease,scale .15s ease-out}.ck-bar>button:active{scale:.96}}",
  ".ck-bar>button:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".ck-bar svg{width:.75rem;height:.75rem;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
  ".ck-bar .ci{--comark-icon-size:.75rem;vertical-align:0}",
  ".ck-copy-done,.ck-copy[data-state=done] .ck-copy-idle{display:none}",
  ".ck-copy[data-state=done] .ck-copy-done{display:block}",
  ".ck-status{position:absolute;top:calc(100% + .25rem);right:var(--_ck-inset);z-index:1;width:max-content;max-width:18rem;padding:.25rem .5rem;border-radius:calc(var(--_comark-radius) - 4px);background:var(--_comark-foreground);color:var(--_comark-background);font:.75rem/1.25rem var(--_comark-font);pointer-events:none}",
  ".ck-status:empty{display:none}",
  // Expand touch targets vertically only, so adjacent buttons cannot steal each other's taps.
  "@media (pointer:coarse){.ck-bar>button::after{content:'';position:absolute;top:50%;left:50%;width:100%;height:max(100%,2.75rem);translate:-50% -50%}}",
  // A terminal is a window: three dots on the left and its title in the middle, over a line.
  `${terminal}>.ck-bar{border-bottom:1px solid var(--_comark-border)}`,
  `${terminal}>.ck-bar::before{content:'';flex:none;width:.625rem;height:.625rem;margin:0 auto 0 .125rem;border-radius:50%;background:currentColor;box-shadow:1rem 0,2rem 0;color:color-mix(in srgb,var(--_comark-muted) 45%,transparent)}`,
  `${terminal} .ck-title{position:absolute;left:50%;max-width:calc(100% - 12rem);margin:0;translate:-50%}`,
  // Red and green lighten in dark mode, like comark-diff's, whether the system or a `.dark` class above sets it.
  `:where(.ck){${light};--_ck-digits:2}`,
  `@media (prefers-color-scheme:dark){:where(.ck){${dark}}}`,
  `:where(.light .ck){${light}}`,
  `:where(.dark .ck){${dark}}`,
  ...[3, 4, 5, 6].map((digits) => `.ck[data-code-numbers="${digits}"]{--_ck-digits:${digits}}`),
  // Each line is a block, its newline inside it, so a marked one can be tinted. The tint is a border image that reaches
  // past the line to the block's edges, which clip it, so it covers the padding whatever the host sets.
  `${lines} .line{display:block;position:relative}`,
  `${lines} .line:empty::after{content:' '}`,
  `${lines} :is(.ck-ins,.diff.add){--_ck-tint:color-mix(in srgb,var(--ck-green) 14%,transparent)}`,
  `${lines} :is(.ck-del,.diff.remove){--_ck-tint:color-mix(in srgb,var(--ck-red) 12%,transparent)}`,
  `${lines} :is(.ck-mark,.highlight,.highlighted){--_ck-tint:color-mix(in srgb,var(--_comark-foreground) 7%,transparent)}`,
  `${lines} .highlighted.error{--_ck-tint:color-mix(in srgb,var(--ck-red) 16%,transparent)}`,
  `${lines} .highlighted.warning{--_ck-tint:color-mix(in srgb,var(--ck-yellow) 18%,transparent)}`,
  `${lines} :is(.ck-ins,.ck-del,.ck-mark,.highlight,.highlighted,.diff.add,.diff.remove){border-image:conic-gradient(var(--_ck-tint) 0 0) fill 0//0 100vw}`,
  // The sign sits in the block's padding, or between the number and the code.
  `${lines} :is(.ck-ins,.ck-del,.diff.add,.diff.remove)::after{position:absolute;top:0;left:-1.5ch;width:1.5ch;text-align:center;user-select:none}`,
  `${lines} :is(.ck-ins,.diff.add)::after{content:'+';color:color-mix(in oklab,var(--ck-green) 70%,var(--_comark-foreground))}`,
  `${lines} :is(.ck-del,.diff.remove)::after{content:'−';color:color-mix(in oklab,var(--ck-red) 75%,var(--_comark-foreground))}`,
  `${lines}[data-code-numbers] .line{padding-left:calc(var(--_ck-digits) * 1ch + 2ch)}`,
  `${lines}[data-code-numbers] .line::before{content:attr(data-line);position:absolute;left:0;width:calc(var(--_ck-digits) * 1ch);color:var(--_comark-muted);text-align:right;user-select:none}`,
  `${lines}[data-code-numbers] .line::after{left:calc(var(--_ck-digits) * 1ch + .25ch)}`,
  `${lines} .ck-fold{display:block}`,
  // A page's own `details` and `summary` rules are unlayered and would box a fold or shift it off the lines' grid, so
  // only `!important` keeps its margins, padding, and border.
  `${lines} .ck-fold{margin:0!important;padding:0!important;border:0!important}`,
  `${lines} .ck-fold>summary{margin:0!important;padding:0!important;border-block:0!important;border-inline:0!important}`,
  `${lines}[data-code-numbers] .ck-fold>summary{padding-left:calc(var(--_ck-digits) * 1ch + 2ch)!important}`,
  `${lines} .ck-fold>summary{display:block;color:var(--_comark-muted);cursor:pointer;list-style:none;border-image:conic-gradient(color-mix(in srgb,var(--_comark-foreground) 5%,transparent) 0 0) fill 0//0 100vw}`,
  `${lines} .ck-fold>summary::-webkit-details-marker{display:none}`,
  `${lines} .ck-fold>summary::before{content:'';display:inline-block;width:1em;height:1em;margin-right:.75ch;background:currentColor;vertical-align:-.15em;mask:${chevrons} center/contain no-repeat}`,
  `@media (hover:hover){${lines} .ck-fold>summary:hover{color:var(--_comark-foreground)}}`,
  `${lines} .ck-fold>summary:focus-visible{outline:none;box-shadow:inset 0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}`,
  // Like GitHub's, an opened range stays open.
  `${lines} .ck-fold[open]>summary{display:none}`,
  `${lines} .highlighted-word{border-radius:calc(var(--_comark-radius) - 6px);background:color-mix(in srgb,var(--_comark-foreground) 12%,transparent)}`,
  ".ck>pre.has-focused .line:not(.focused){opacity:.7;filter:blur(.095rem);transition:filter .3s,opacity .3s}",
  ".ck>pre.has-focused:hover .line:not(.focused){opacity:1;filter:none}",
].join("")}}${
  // Pages set a code block's padding, overflow, and `white-space` with plain rules, which beat any layered one. A tinted
  // line reaches past the block, which must clip it.
  // Like T3 Code's, the header has no inset under its buttons, and the code starts a block padding below it.
  "div.ck>pre{padding-top:calc(var(--_ck-size) + var(--_ck-inset) + .75rem)}" +
  `div${terminal}>pre{padding-top:calc(var(--_ck-bar) + .625rem)}` +
  "div.ck[data-code-lines]>pre{overflow-x:auto}" +
  ".ck[data-code-wrap]>pre,.ck[data-code-wrap]>pre>code{white-space:pre-wrap;overflow-wrap:anywhere}"
}`;
