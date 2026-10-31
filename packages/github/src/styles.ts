import { theme } from "comark-zoom/theme";

const types = ["note", "tip", "important", "warning", "caution"];

/**
 * Callouts in the style of shadcn/ui's Alert: a bordered card on the shared `--comark-*` tokens, its icon and title in
 * the type's color. Set `--cgc-note` through `--cgc-caution` to recolor a type; caution follows shadcn's
 * `--destructive`. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cgc", "status"),
  ":where(.cgc){--cgc-note:var(--_comark-info);--cgc-tip:var(--_comark-success);--cgc-important:#7c3aed;--cgc-warning:var(--_comark-warning);--cgc-caution:var(--_comark-danger)}",
  "@media (prefers-color-scheme:dark){:where(.cgc){--cgc-important:#a78bfa}}",
  ...types.map((type) => `.cgc[data-type="${type}"]{--cgc-color:var(--cgc-${type})}`),
  ".cgc{display:grid;grid-template-columns:1rem minmax(0,1fr);gap:.125rem .75rem;align-items:start;margin:1rem 0;padding:.75rem 1rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .875rem/1.5 var(--_comark-font)}",
  ".cgc-icon{display:flex;height:1.3125rem;align-items:center;color:var(--cgc-color)}",
  ".cgc-icon svg{width:1rem;height:1rem}",
  ".cgc-title{grid-column:2;margin:0;color:var(--cgc-color);font-weight:500}",
  ".cgc-body{grid-column:2;color:var(--_comark-muted)}",
  ".cgc-body>:first-child{margin-top:0}",
  ".cgc-body>:last-child{margin-bottom:0}",
].join("")}}`;
