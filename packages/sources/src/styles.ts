import { theme } from "comark-zoom/theme";

/**
 * Citation markers as small superscript links, and the sources as a muted numbered list under a rule, on the shared
 * `--comark-*` tokens. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cso,.cso-cite"),
  ".cso-cite{font-size:.75em;line-height:0;white-space:nowrap}",
  ".cso-cite a{color:var(--_comark-muted);text-decoration:none;font-variant-numeric:tabular-nums}",
  ".cso-cite a:hover{color:var(--_comark-foreground);text-decoration:underline}",
  ".cso{margin:1.5rem 0 1rem;padding-top:1rem;border-top:1px solid var(--_comark-border);color:var(--_comark-muted);font:400 .875rem/1.5rem var(--_comark-font)}",
  ".cso-title{margin:0 0 .5rem;color:var(--_comark-foreground);font-weight:500}",
  ".cso ol{display:grid;gap:.25rem;margin:0;padding-inline-start:1.5rem}",
  ".cso li{margin:0;padding-inline-start:.25rem;overflow-wrap:anywhere}",
  ".cso li::marker{color:var(--_comark-muted);font-variant-numeric:tabular-nums}",
  ".cso li a{color:var(--_comark-foreground);text-underline-offset:4px}",
  ".cso .cso-back{margin-inline-start:.25rem;color:var(--_comark-muted);text-decoration:none}",
  // A citation that was just followed shows which source it points at.
  ".cso li:target{border-radius:calc(var(--_comark-radius) - 6px);background:var(--_comark-accent)}",
  ".cso a:focus-visible,.cso-cite a:focus-visible{border-radius:calc(var(--_comark-radius) - 6px);outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
].join("")}}`;
