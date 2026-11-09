import { theme } from "comark-zoom/theme";

const ease = "cubic-bezier(.32,.72,0,1)";

/**
 * A time as plain text that tints on hover. Its tooltip is a pill that opens above the text, or below it where the
 * page has no room, and grows from the edge that touches the text: the browser's anchor positioning places it and
 * flips it, and an anchored container query turns the origin and the nudge around with it. Hover waits 300ms and focus
 * doesn't, and a tap on a touch screen focuses. Override `--ctm-enter` and `--ctm-exit`, the durations. The rules sit
 * in the `comark` layer, so any unlayered rule of the host's wins.
 *
 * `below` is the anchored container query. `style.css` leaves it out, because lightningcss 1.33, which Vite minifies CSS
 * with, can't parse `anchored()` and fails the build. The components and the HTML renderer add the whole `css`.
 */
const sheet = (below: string) =>
  `@layer comark{${[
    theme(".ctm", "shadow"),
    ":where(.ctm){--ctm-enter:140ms;--ctm-exit:100ms}",
    ".ctm{display:inline;margin:0 -.125rem;padding:0 .125rem;border-radius:calc(var(--_comark-radius) / 2);font-variant-numeric:tabular-nums;white-space:nowrap;cursor:default;transition:background-color 150ms ease-out}",
    ".ctm:focus{outline:2px solid var(--_comark-ring);outline-offset:1px}",
    ".ctm:focus:not(:focus-visible){outline:0}",
    ".ctm:focus{background:var(--_comark-accent)}",
    "@media (hover:hover) and (pointer:fine){.ctm:hover{background:var(--_comark-accent)}}",
    // The tip is fixed so no ancestor's overflow clips it, and the first unscoped `position` below is its fallback.
    `.ctm-tip{position:fixed;z-index:10;display:block;width:max-content;max-width:min(24rem,calc(100vw - 1rem));margin:0;padding:0;visibility:hidden;pointer-events:none;white-space:normal;transition:visibility 0s linear var(--ctm-exit)}`,
    `.ctm-pill{display:block;padding:.25rem .5rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-background);box-shadow:var(--_comark-shadow);color:var(--_comark-foreground);font:400 .8125rem/1.4 var(--_comark-font);text-align:center;opacity:0;scale:.97;translate:0 calc(var(--ctm-dir,1) * 4px);transform-origin:50% 100%;transition:opacity var(--ctm-exit) ease-in,scale var(--ctm-exit) ease-in,translate var(--ctm-exit) ease-in}`,
    ".ctm:focus .ctm-tip{visibility:visible;transition-delay:0s}",
    `.ctm:focus .ctm-pill{opacity:1;scale:1;translate:0 0;transition:opacity var(--ctm-enter) ${ease},scale var(--ctm-enter) ${ease},translate var(--ctm-enter) ${ease}}`,
    `@media (hover:hover) and (pointer:fine){.ctm:hover .ctm-tip{visibility:visible;transition-delay:0s}.ctm:hover .ctm-pill{opacity:1;scale:1;translate:0 0;transition:opacity var(--ctm-enter) ${ease} 300ms,scale var(--ctm-enter) ${ease} 300ms,translate var(--ctm-enter) ${ease} 300ms}.ctm:focus .ctm-pill{transition-delay:0s}}`,
    "@supports (anchor-scope:all){" +
      ".ctm{anchor-name:--ctm;anchor-scope:--ctm}" +
      // Centered above the text. Where that runs off the window it lines up with an edge of the text instead, and where there is no room above it goes below.
      ".ctm-tip{position-anchor:--ctm;position-area:top;justify-self:anchor-center;position-try-fallbacks:--ctm-end,--ctm-start,--ctm-below,--ctm-below-end,--ctm-below-start;margin:.375rem .25rem;container-type:anchored}" +
      "@position-try --ctm-end{position-area:top span-left;justify-self:end}" +
      "@position-try --ctm-start{position-area:top span-right;justify-self:start}" +
      "@position-try --ctm-below{position-area:bottom;justify-self:anchor-center}" +
      "@position-try --ctm-below-end{position-area:bottom span-left;justify-self:end}" +
      "@position-try --ctm-below-start{position-area:bottom span-right;justify-self:start}" +
      below +
      "}",
    "@supports not (anchor-scope:all){.ctm{position:relative}.ctm-tip{position:absolute;bottom:100%;left:0;margin-bottom:.375rem}}",
    "@media (prefers-reduced-motion:reduce){.ctm,.ctm-tip,.ctm-pill{transition:none!important}.ctm-pill{scale:1;translate:none}}",
  ].join("")}}`;

// Below the text, the pill grows from its top edge and starts above its place.
export const css = sheet(
  "@container anchored(fallback:--ctm-below) or anchored(fallback:--ctm-below-end) or anchored(fallback:--ctm-below-start){.ctm-pill{--ctm-dir:-1;transform-origin:50% 0}}",
);

/** `css` without the anchored container query, for `style.css`. */
export const stylesheet = sheet("");
