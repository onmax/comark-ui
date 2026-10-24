import { theme } from "comark-zoom/theme";

/**
 * A contents list in the style of shadcn/ui's "On this page": no box, its title a small label, its first-level links
 * in the text's color and the nested ones muted beside a guide line, on the shared `--comark-*` tokens. The rules sit
 * in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cto"),
  ".cto{margin:1.5rem 0;color:var(--_comark-foreground);font:400 .875rem/1.25rem var(--_comark-font)}",
  ".cto-title{margin:0 0 .5rem;color:var(--_comark-foreground);font-size:.875rem;font-weight:500}",
  ".cto ul{display:grid;gap:.375rem;margin:0;padding:0;list-style:none}",
  ".cto ul ul{margin:.375rem 0 0 .25rem;padding-inline-start:.75rem;border-inline-start:1px solid var(--_comark-border)}",
  ".cto li{margin:0;padding:0}",
  ".cto a{color:inherit;text-decoration:none;text-underline-offset:4px;transition:color .15s}",
  ".cto a:hover{text-decoration:underline}",
  ".cto a:focus-visible{border-radius:calc(var(--_comark-radius)/4);outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cto ul ul a{color:var(--_comark-muted)}",
  ".cto ul ul a:hover{color:var(--_comark-foreground)}",
  "@media print{.cto{break-inside:avoid}}",
].join("")}}`;
