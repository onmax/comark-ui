import { theme } from "comark-zoom/theme";

/**
 * Fields as rows split by a line, each with its name in code, its type, a required tag, and its default, and the
 * properties of an object indented under a guide line, on the shared `--comark-*` tokens. The rules sit in the
 * `comark` layer, so any unlayered rule of the host's wins. The required tag takes shadcn/ui's `--destructive`.
 */
export const css = `@layer comark{${[
  theme(".cfl,.cfl-group", "status"),
  ".cfl-group{margin:1.5rem 0}",
  ".cfl{margin:1rem 0;padding:1rem 0;border-bottom:1px solid var(--_comark-border);font-family:var(--_comark-font)}",
  ".cfl-group>.cfl{margin:0}",
  ".cfl-group>.cfl:first-child{padding-top:0}",
  ".cfl-group>.cfl:last-child{border-bottom:0}",
  ".cfl-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .75rem;font-size:.875rem;line-height:1.5rem}",
  ".cfl-name{color:var(--_comark-foreground);font-weight:600;font-size:.875rem}",
  ".cfl-type{color:var(--_comark-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.8125rem}",
  ":where(.cfl){--cfl-required:var(--_comark-danger)}",
  ".cfl-required{padding:0 .375rem;border-radius:calc(var(--_comark-radius) - 4px);background:color-mix(in srgb,var(--cfl-required) 10%,transparent);color:color-mix(in srgb,var(--cfl-required) 85%,var(--_comark-foreground));font-size:.75rem;font-weight:500;line-height:1.25rem}",
  ".cfl-default{color:var(--_comark-muted);font-size:.8125rem}",
  ".cfl-default code{font-size:inherit}",
  ".cfl-body{margin-top:.5rem;color:var(--_comark-muted);font-size:.875rem;line-height:1.5rem}",
  ".cfl-body:empty{display:none}",
  // A page's paragraph and list margins are almost always unlayered, so only `!important` keeps them from opening a gap
  // under the name.
  ".cfl-body>:first-child{margin-top:0!important}",
  ".cfl-body>:last-child{margin-bottom:0!important}",
  // An object's properties sit under it, drawn as a group of their own.
  ".cfl-body>.cfl{margin:0;padding:.75rem 0 .75rem 1rem;border-bottom:0;border-inline-start:1px solid var(--_comark-border)}",
  ".cfl-body>.cfl+.cfl{padding-top:0}",
  "@media print{.cfl{break-inside:avoid}}",
].join("")}}`;
