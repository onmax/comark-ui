// Each token, the Nuxt UI and shadcn/ui variables it falls back to, and shadcn's neutral theme for when neither is set.
const tokens = [
  ["background", "ui-bg", "background", "#fff", "#0a0a0a"],
  ["foreground", "ui-text-highlighted", "foreground", "#0a0a0a", "#fafafa"],
  ["muted", "ui-text-muted", "muted-foreground", "#737373", "#a1a1a1"],
  ["border", "ui-border", "border", "#e5e5e5", "rgb(255 255 255/.1)"],
  ["accent", "ui-bg-elevated", "accent", "#f5f5f5", "#262626"],
  ["ring", "ui-primary", "ring", "#a1a1a1", "#737373"],
] as const;

const resolve = (scheme: 3 | 4) =>
  tokens
    .map(
      (token) =>
        `--_comark-${token[0]}:var(--comark-${token[0]},var(--${token[1]},var(--${token[2]},${token[scheme]})))`,
    )
    .join(";");

/**
 * Resolves the `--comark-*` tokens on `selector`, falling back to Nuxt UI's variables, then shadcn/ui's, then shadcn's
 * neutral theme. Nuxt UI's corners are twice its `--ui-radius`, so the radius halves shadcn's to double it back.
 * They resolve on the component rather than `:root`, so a `.dark` class anywhere above it switches the theme, and a
 * `--comark-*` set on any ancestor still inherits down. `:where()` keeps them at zero specificity.
 */
export function theme(selector: string): string {
  const where = `:where(${selector})`;
  return (
    `${where}{${resolve(3)};--_comark-radius:var(--comark-radius,calc(var(--ui-radius,calc(var(--radius,.625rem)/2))*2));--_comark-font:var(--comark-font,var(--font-sans,ui-sans-serif,system-ui,sans-serif))}` +
    `@media (prefers-color-scheme:dark){${where}{${resolve(4)}}}`
  );
}
