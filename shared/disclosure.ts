// Closing runs faster than opening, since the reader has already moved on. Parts that move with the content, like a
// chevron, take the same timing so they land together.
export const opening = ".25s cubic-bezier(.23,1,.32,1)";
export const closing = ".18s cubic-bezier(.23,1,.32,1)";

// Bundled into each package, so its disclosures animate without loading another plugin. `rules` holds a block's own
// motion, so it animates only where the content does. `selector()` comes first because autoprefixer, which Nuxt runs,
// throws on a `selector(::…)` that follows another condition.
export const disclosureMotion = (selector: string, rules = ""): string =>
  "@supports selector(::details-content) and (interpolate-size:allow-keywords){" +
  "@media screen and (prefers-reduced-motion:no-preference){" +
  `${selector}{interpolate-size:allow-keywords}` +
  // Contain child margins so they reveal with the content instead of jumping outside its animated height. The content
  // fades as it grows, and fades out before the height clips it, so text never slides under a hard edge.
  `${selector}::details-content{display:flow-root;block-size:0;opacity:0;overflow-y:clip;transition:block-size ${closing},opacity .12s ease-in,content-visibility .18s allow-discrete}` +
  `${selector}[open]::details-content{block-size:auto;opacity:1;transition:block-size ${opening},opacity ${opening},content-visibility .25s allow-discrete}` +
  `${rules}}}` +
  // Firefox and Safari can't grow a height to `auto`, and Firefox runs no transition or animation on
  // `::details-content`, so there the content's children fade in as it opens. Closing stays instant, since a closed
  // details hides its content before anything could fade it out. Text alone has no element to fade, and a details that
  // starts open fades in once on load.
  "@supports not (interpolate-size:allow-keywords){" +
  "@media screen and (prefers-reduced-motion:no-preference){" +
  `${selector}[open]>:not(summary){animation:comark-disclosure-in ${opening}}` +
  "}}" +
  "@keyframes comark-disclosure-in{from{opacity:0;translate:0 -4px}}";
