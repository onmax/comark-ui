import { theme } from "comark-zoom/theme";

/**
 * The properties as a two-column grid in a bordered box, labels muted and lists as small badges in the style of
 * shadcn/ui's Badge, on the shared `--comark-*` tokens. The rules sit in the `comark` layer, so any unlayered rule of
 * the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cfm"),
  ".cfm{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.5rem 1.5rem;margin:0 0 1.5rem;padding:1rem 1.25rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .875rem/1.5rem var(--_comark-font)}",
  ".cfm>div{display:contents}",
  ".cfm dt{color:var(--_comark-muted)}",
  ".cfm dd{display:flex;flex-wrap:wrap;gap:.375rem;min-width:0;overflow-wrap:anywhere}",
  ".cfm :is(dt,dd){margin:0;padding:0}",
  ".cfm a{color:inherit;text-underline-offset:4px}",
  ".cfm a:focus-visible{border-radius:calc(var(--_comark-radius)/4);outline:2px solid var(--_comark-ring);outline-offset:2px;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cfm-tag{display:inline-flex;align-items:center;padding:0 .5rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-accent);font-size:.75rem;font-weight:500;line-height:1.25rem}",
  "@media print{.cfm{break-inside:avoid}}",
].join("")}}`;
