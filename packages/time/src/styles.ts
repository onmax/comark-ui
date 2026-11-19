import { theme } from "comark-zoom/theme";

const ease = "cubic-bezier(.32,.72,0,1)";

/**
 * A time as plain text that tints on hover. Its tooltip is a pill that opens above the text, or below it where the
 * page has no room: the browser's anchor positioning places it and flips it. Hover waits 300ms and focus doesn't, and a
 * tap on a touch screen focuses. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 *
 * On its own the pill fades in place, over `--ctm-enter` and `--ctm-exit`. Where the page runs the motion layer, the
 * script marks the time with `data-ctm-motion`, which turns the fade off, and adds a `.ctm-live` copy of the pill while
 * the tooltip is open, which the layer raises from behind the time and sinks back when the script removes it.
 */
export const css = `@layer comark{${[
  theme(".ctm", "shadow"),
  ":where(.ctm){--ctm-enter:140ms;--ctm-exit:100ms}",
  ".ctm{display:inline;margin:0 -.125rem;padding:0 .125rem;border-radius:calc(var(--_comark-radius) / 2);font-variant-numeric:tabular-nums;white-space:nowrap;cursor:default;transition:background-color 150ms ease-out}",
  ".ctm:focus{outline:2px solid var(--_comark-ring);outline-offset:1px}",
  ".ctm:focus:not(:focus-visible){outline:0}",
  ".ctm:focus{background:var(--_comark-accent)}",
  "@media (hover:hover) and (pointer:fine){.ctm:hover{background:var(--_comark-accent)}}",
  // The tip is fixed so no ancestor's overflow clips it, and the first unscoped `position` below is its fallback.
  `.ctm-tip{position:fixed;z-index:10;display:block;width:max-content;max-width:min(24rem,calc(100vw - 1rem));margin:0;padding:0;visibility:hidden;pointer-events:none;white-space:normal;transition:visibility 0s linear var(--ctm-exit)}`,
  // The live copy is the tip and the pill in one box, since the motion layer reveals the box it raises.
  ".ctm-pill,.ctm-live{display:block;padding:.25rem .5rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-background);box-shadow:var(--_comark-shadow);color:var(--_comark-foreground);font:400 .8125rem/1.4 var(--_comark-font);text-align:center}",
  ".ctm-live{visibility:visible;transition:none}",
  ".ctm-pill{opacity:0;transition:opacity var(--ctm-exit) ease-in}",
  ".ctm:not([data-ctm-motion]):focus .ctm-tip{visibility:visible;transition-delay:0s}",
  `.ctm:not([data-ctm-motion]):focus .ctm-pill{opacity:1;transition:opacity var(--ctm-enter) ${ease}}`,
  `@media (hover:hover) and (pointer:fine){.ctm:not([data-ctm-motion]):hover .ctm-tip{visibility:visible;transition-delay:0s}.ctm:not([data-ctm-motion]):hover .ctm-pill{opacity:1;transition:opacity var(--ctm-enter) ${ease} 300ms}.ctm:focus .ctm-pill{transition-delay:0s}}`,
  "@supports (anchor-scope:all){" +
    ".ctm{anchor-name:--ctm;anchor-scope:--ctm}" +
    // Centered above the text. Where that runs off the window it lines up with an edge of the text instead, and where there is no room above it goes below.
    ".ctm-tip{position-anchor:--ctm;position-area:top;justify-self:anchor-center;position-try-fallbacks:--ctm-end,--ctm-start,--ctm-below,--ctm-below-end,--ctm-below-start;margin:.375rem .25rem}" +
    "@position-try --ctm-end{position-area:top span-left;justify-self:end}" +
    "@position-try --ctm-start{position-area:top span-right;justify-self:start}" +
    "@position-try --ctm-below{position-area:bottom;justify-self:anchor-center}" +
    "@position-try --ctm-below-end{position-area:bottom span-left;justify-self:end}" +
    "@position-try --ctm-below-start{position-area:bottom span-right;justify-self:start}" +
    "}",
  // Escape closed it, at once: the script marks the time until focus and the pointer leave it.
  ".ctm[data-dismissed] .ctm-tip:not(.ctm-live){visibility:hidden;transition-delay:0s}",
  "@supports not (anchor-scope:all){.ctm{position:relative}.ctm-tip{position:absolute;bottom:100%;left:0;margin-bottom:.375rem}}",
  "@media (prefers-reduced-motion:reduce){.ctm,.ctm-tip,.ctm-pill{transition:none!important}}",
].join("")}}`;

/** The same styles for `style.css`. */
export const stylesheet = css;
