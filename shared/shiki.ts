const swap = (span: string) =>
  `${span}[style*="--shiki-dark:"]{color:var(--shiki-dark)!important}` +
  `${span}[style*="--shiki-dark-font-style:"]{font-style:var(--shiki-dark-font-style)!important}` +
  `${span}[style*="--shiki-dark-font-weight:"]{font-weight:var(--shiki-dark-font-weight)!important}`;

// Bundled by each package that draws Shiki's tokens, so code follows dark mode without the typeset styles. Code
// highlighted with a light and a dark theme turns with the page, as the tokens do: under a `.dark` class, or in the
// system's dark mode on a page with no `.light` class. A span switches what it has a dark value for. Shiki writes the
// light colors inline, so only `!important` beats them.
export const shikiDark =
  swap(".shiki:where(.dark *) span") +
  `@media (prefers-color-scheme:dark){${swap(".shiki:not(:where(.light *)) span")}}`;
