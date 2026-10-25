import { theme } from "comark-zoom/theme";

/**
 * A message as a column: text, files, and each trace of steps as a list of quiet lines, a reasoning or a tool call
 * folding open to its details. The colors come from the `--comark-*` tokens, so a page themes chat messages with the
 * other plugins, and errors read Nuxt UI's `--ui-error` or shadcn/ui's `--destructive`. The rules sit in the `comark`
 * layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cht"),
  ":where(.cht){--cht-error:var(--ui-error,var(--destructive,#dc2626))}",
  "@media (prefers-color-scheme:dark){:where(.cht){--cht-error:var(--ui-error,var(--destructive,#f87171))}}",
  ".cht{display:flex;flex-direction:column;gap:.75rem;min-width:0;color:var(--_comark-foreground);font-family:var(--_comark-font)}",
  ".cht-text{min-width:0;overflow-wrap:anywhere}",
  ".cht-text>:first-child{margin-top:0}.cht-text>:last-child{margin-bottom:0}",
  ".cht-trace{display:flex;flex-direction:column;gap:.125rem;margin:0;padding:0;list-style:none;font-size:.875rem;line-height:1.25rem}",
  ".cht-step{margin:0}",
  ".cht-line{display:flex;align-items:center;gap:.5rem;width:fit-content;max-width:calc(100% + 1rem);margin-inline:-.5rem;padding:.25rem .5rem;border-radius:calc(var(--_comark-radius) - 4px);color:var(--_comark-muted);text-decoration:none}",
  "summary.cht-line{cursor:pointer;list-style:none}summary.cht-line::-webkit-details-marker{display:none}",
  ":is(summary,a).cht-line:hover{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  ":is(summary,a).cht-line:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:-2px}",
  ".cht-dot{flex:none;width:.375rem;height:.375rem;border-radius:50%;background:currentColor;opacity:.5}",
  ".cht-step[data-status=running] .cht-dot,.cht-step[data-status=waiting] .cht-dot{animation:cht-pulse 1.2s ease-in-out infinite}",
  ".cht-step[data-status=error] .cht-line{color:var(--cht-error)}",
  ".cht-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".cht-state{flex:none;font-size:.75rem;opacity:.8}",
  // The chevron is a border, so it takes the line's color and needs no icon.
  "summary.cht-line::after{content:'';flex:none;width:.3125rem;height:.3125rem;margin-inline:.125rem .25rem;border:solid currentColor;border-width:0 1.5px 1.5px 0;opacity:.6;transform:rotate(-45deg);transition:transform .15s}",
  "details[open]>summary.cht-line::after{transform:rotate(45deg)}",
  ".cht-detail{display:flex;flex-direction:column;gap:.5rem;margin:.25rem 0 .5rem .1875rem;padding-inline-start:1rem;border-inline-start:1px solid var(--_comark-border)}",
  ".cht-detail>.cht-text{color:var(--_comark-muted)}",
  ".cht-value{overflow:hidden;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px)}",
  ".cht-value-label{padding:.5rem .625rem 0;font-size:.75rem;font-weight:500}",
  ".cht-value pre{max-height:20rem;margin:0;padding:.5rem .625rem;overflow:auto;background:none;font:.75rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}",
  ".cht-value[data-label=Error]{border-color:color-mix(in srgb,var(--cht-error) 40%,transparent);color:var(--cht-error)}",
  ".cht-file{display:inline-flex;flex-direction:column;align-self:flex-start;max-width:100%;padding:.5rem .75rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);color:inherit;font-size:.875rem;line-height:1.25rem;text-decoration:none}",
  "a.cht-file:hover{background:var(--_comark-accent)}",
  ".cht-file-name{overflow:hidden;font-weight:500;text-overflow:ellipsis;white-space:nowrap}",
  ".cht-file-type{color:var(--_comark-muted);font-size:.75rem}",
  ".cht-image{display:block;align-self:flex-start;max-width:min(100%,24rem);max-height:20rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) - 2px);object-fit:contain}",
  "@keyframes cht-pulse{50%{opacity:1}}",
  "@media (prefers-reduced-motion:reduce){.cht-dot{animation:none!important}summary.cht-line::after{transition:none}}",
  "@media (forced-colors:active){.cht-dot{background:CanvasText}}",
].join("")}}`;
