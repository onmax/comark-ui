// Bundled into each package, so its disclosures animate without loading another plugin.
export const disclosureMotion = (selector: string): string =>
  "@supports (interpolate-size:allow-keywords) and selector(::details-content){" +
  "@media screen and (prefers-reduced-motion:no-preference){" +
  `${selector}{interpolate-size:allow-keywords}` +
  // Contain child margins so they reveal with the content instead of jumping outside its animated height.
  `${selector}::details-content{display:flow-root;block-size:0;overflow-y:clip;transition:block-size .25s cubic-bezier(.23,1,.32,1),content-visibility .25s allow-discrete}` +
  `${selector}[open]::details-content{block-size:auto}}}`;
