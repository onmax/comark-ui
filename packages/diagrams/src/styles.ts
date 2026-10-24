import { theme } from "comark-zoom/theme";

/**
 * Each diagram on a white card, since diagram tools draw dark lines on a white page, at most the page's width, with
 * its title under it, on the shared `--comark-*` tokens. Override `--cdg-canvas` for the card. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cdg"),
  // Diagram tools draw dark lines on white whatever the page's theme, so the card stays white on a dark page.
  ":where(.cdg){--cdg-canvas:#fff}",
  ".cdg{margin:1.5rem 0;font-family:var(--_comark-font)}",
  ".cdg-svg{overflow-x:auto;padding:1rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--cdg-canvas);color-scheme:light;text-align:center}",
  ".cdg-svg svg{max-width:100%;height:auto}",
  ".cdg figcaption{margin-top:.75rem;color:var(--_comark-muted);font-size:.875rem;line-height:1.25rem;text-align:center}",
  "@media print{.cdg{break-inside:avoid}}",
].join("")}}`;
