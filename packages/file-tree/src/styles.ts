import { theme } from "comark-zoom/theme";
import { disclosureMotion } from "../../../shared/disclosure.ts";

/**
 * A tree in a bordered box, with a guide line down each open folder, on the shared `--comark-*` tokens. Added, removed,
 * and changed entries take `--cft-added`, `--cft-removed`, and `--cft-changed`; removed defaults to shadcn/ui's
 * `--destructive`. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  disclosureMotion(".cft details"),
  theme(".cft"),
  ":where(.cft){--cft-added:#16a34a;--cft-removed:var(--destructive,#dc2626);--cft-changed:#d97706}",
  "@media (prefers-color-scheme:dark){:where(.cft){--cft-added:#4ade80;--cft-removed:var(--destructive,#f87171);--cft-changed:#fbbf24}}",
  ".cft{margin:1.5rem 0;padding:.75rem;overflow-x:auto;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .8125rem/1.25rem ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
  // A page's list margins, padding, and bullets are almost always unlayered, so only `!important` keeps them out of the
  // tree's indents.
  ".cft ul{margin:0!important;padding:0!important;list-style:none!important}",
  ".cft ul ul{margin-inline-start:calc(.5rem - .5px)!important;padding-inline-start:.75rem!important;border-inline-start:1px solid var(--_comark-border)}",
  ".cft li{margin:0!important;padding:0!important}",
  // Prose styles often space out `details` and pad `summary`, which would push folders apart from their guide lines.
  ".cft details{margin:0!important;padding:0!important}",
  ".cft summary{display:block;margin:0!important;padding:0!important;list-style:none;border-radius:calc(var(--_comark-radius) - 4px);cursor:pointer}",
  ".cft summary::-webkit-details-marker{display:none}",
  ".cft summary:hover{background:var(--_comark-accent)}",
  ".cft summary:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cft-entry{display:flex;align-items:center;gap:.375rem;padding:.125rem .25rem;white-space:nowrap}",
  ".cft-glyph{flex:none;width:1rem;height:1rem;color:var(--_comark-muted)}",
  ".cft-entry .ci{flex:none;font-size:1rem}",
  ".cft-note{margin-inline-start:.75rem;color:var(--_comark-muted);font-family:var(--_comark-font);white-space:normal}",
  ".cft-mark{font-weight:600}",
  ".cft [data-state='added']>.cft-entry,.cft [data-state='added']>details>summary>.cft-entry{color:var(--cft-added)}",
  ".cft [data-state='removed']>.cft-entry,.cft [data-state='removed']>details>summary>.cft-entry{color:var(--cft-removed)}",
  ".cft [data-state='removed'] .cft-name{text-decoration:line-through}",
  ".cft [data-state='changed']>.cft-entry,.cft [data-state='changed']>details>summary>.cft-entry{color:var(--cft-changed)}",
  ".cft [data-type='more']{padding:0 .25rem;color:var(--_comark-muted)}",
].join("")}}`;
