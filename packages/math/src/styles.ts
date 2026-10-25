import { theme } from "comark-zoom/theme";

// Temml draws a few notations with classes, since Chromium's MathML Core has no `menclose` and doesn't stretch every
// accent: cancel and strike, over- and underlines, boxes, and wide hats and tildes. Firefox and Safari draw them.
const chromium = [
  ".cmh menclose{position:relative;padding:.5ex 0}",
  ".cmh .tml-overline{padding:.1em 0 0;border-top:.065em solid}",
  ".cmh .tml-underline{padding:0 0 .1em;border-bottom:.065em solid}",
  ".cmh .tml-cancel{display:inline-block;position:absolute;left:.5px;bottom:0;width:100%;height:100%;background-color:currentColor}",
  ".cmh .upstrike{clip-path:polygon(.05em 100%,0 calc(100% - .05em),calc(100% - .05em) 0,100% .05em)}",
  ".cmh .downstrike{clip-path:polygon(0 .05em,.05em 0,100% calc(100% - .05em),calc(100% - .05em) 100%)}",
  ".cmh .sout{clip-path:polygon(0 calc(55% + .0333em),0 calc(55% - .0333em),100% calc(55% - .0333em),100% calc(55% + .0333em))}",
  ".cmh .tml-xcancel{clip-path:polygon(.05em 0,0 .05em,calc(50% - .05em) 50%,0 calc(100% - .05em),.05em 100%,50% calc(50% + .05em),calc(100% - .05em) 100%,100% calc(100% - .05em),calc(50% + .05em) 50%,100% .05em,calc(100% - .05em) 0,50% calc(50% - .05em))}",
  ".cmh .tml-fbox{padding:3pt;border:1px solid}",
  ...[2, 3, 4].map((size) => `.cmh .tml-tilde-${size}{transform:scale(${size},1.1)}`),
  ...[1.9, 3.9, 5.8, 7.8].map(
    (scale, index) => `.cmh .tml-hat-${index + 1}{transform:scale(${scale},1)}`,
  ),
  ".cmh .tml-right{text-align:-webkit-right}",
  ".cmh .tml-left{text-align:-webkit-left}",
].join("");

/**
 * Formulas in the system's math font and the text's color. Display math is centered, and scrolls sideways when it's
 * wider than the page instead of overflowing it; inline math doesn't break across lines. A formula that couldn't be
 * typeset shows its TeX in a muted monospace font. Override `--cmh-font` to pick another math font. The rules sit in the
 * `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cmh"),
  ':where(.cmh){--cmh-font:"STIX Two Math","Cambria Math","Latin Modern Math","Noto Sans Math",math}',
  ".cmh math{font-family:var(--cmh-font);font-style:normal;font-weight:400;letter-spacing:normal;line-height:normal;text-indent:0;text-transform:none;direction:ltr}",
  ".cmh math *{border-color:currentColor}",
  ".cmh{white-space:nowrap}",
  // `safe` centers a formula that fits and starts one that doesn't at the left edge, where scrolling can reach it.
  ".cmh-display{display:flex;justify-content:safe center;margin:1em 0;padding:.25em 0;overflow-x:auto;overflow-y:hidden}",
  ".cmh.cmh-source{color:var(--_comark-muted);font:.875em/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap}",
  `@supports (not (-webkit-backdrop-filter:blur(1px))) and (not (-moz-appearance:none)){${chromium}}`,
  "@media print{.cmh menclose{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
].join("")}}`;
