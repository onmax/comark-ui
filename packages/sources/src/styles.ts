import { theme } from "comark-zoom/theme";

/**
 * Citation markers as small superscript links, the card a citation shows while a pointer rests on it, and the sources
 * as a muted numbered list under a rule, on the shared `--comark-*` tokens. The rules sit in the `comark` layer, so any
 * unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cso,.cso-cite,.cso-card", "shadow"),
  ".cso-cite{font-size:.75em;line-height:0;white-space:nowrap}",
  ".cso-cite a{position:relative;color:var(--_comark-muted);text-decoration:none;font-variant-numeric:tabular-nums}",
  // A marker is a digit or two, so the pointer gets more to land on, without moving the text or the focus ring.
  '.cso-cite a::after{content:"";position:absolute;inset:-.25em}',
  ".cso-cite a:hover,.cso-cite a[data-cso-open]{color:var(--_comark-foreground);text-decoration:underline}",
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
  // The card is a popover in the top layer, placed by the script. It grows from the citation and fades out faster than
  // it came in; one that opens while another is showing, or from the keyboard, appears at once.
  ".cso-card{position:fixed;inset:auto;box-sizing:border-box;width:max-content;max-width:min(20rem,calc(100vw - 1rem));margin:0;padding:0;overflow:visible;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-background);color:var(--_comark-foreground);box-shadow:var(--_comark-shadow);font:400 .875rem/1.43 var(--_comark-font);text-align:start;transition:opacity .15s cubic-bezier(.23,1,.32,1),transform .15s cubic-bezier(.23,1,.32,1),overlay .15s allow-discrete,display .15s allow-discrete}",
  ".cso-card:not(:popover-open){opacity:0;transform:scale(.97);transition-duration:.1s}",
  "@starting-style{.cso-card:popover-open{opacity:0;transform:scale(.97)}}",
  ".cso-card[data-instant]{transition:none}",
  // The pointer crosses the gap between the citation and the card without leaving either.
  '.cso-card::before{content:"";position:absolute;z-index:-1;inset:-6px 0}',
  ".cso-card-link{display:grid;gap:.375rem;padding:.625rem .75rem;color:inherit;text-decoration:none}",
  ".cso-card-site{display:flex;align-items:center;gap:.375rem;min-width:0;color:var(--_comark-muted);font-size:.75rem;line-height:1.33}",
  ".cso-card-image,.cso-card-globe{flex:none;width:1rem;height:1rem}",
  ".cso-card-image{margin:0;border-radius:calc(var(--_comark-radius) - 6px);outline:1px solid color-mix(in oklab,var(--_comark-foreground) 10%,transparent);outline-offset:-1px;object-fit:cover}",
  ".cso-card[data-icon='avatar'] .cso-card-image{border-radius:50%}",
  ".cso-card[data-icon='globe'] .cso-card-image,.cso-card:not([data-icon='globe']) .cso-card-globe{display:none}",
  ".cso-card-host{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".cso-card-arrow{flex:none;width:.875rem;height:.875rem;margin-inline-start:auto;transition:color .15s ease}",
  ".cso-card-title{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:3;font-weight:500;overflow-wrap:anywhere;text-wrap:pretty;text-decoration:underline transparent;text-decoration-thickness:from-font;text-underline-offset:.2em;transition:text-decoration-color .15s ease}",
  "@media (hover:hover){.cso-card-link:hover .cso-card-title{text-decoration-color:currentColor}.cso-card-link:hover .cso-card-arrow{color:var(--_comark-foreground)}}",
  "@media (prefers-reduced-motion:reduce){.cso-card,.cso-card:not(:popover-open){transform:none}@starting-style{.cso-card:popover-open{transform:none}}}",
].join("")}}`;
