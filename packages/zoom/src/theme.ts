// Each token, the Nuxt UI and shadcn/ui variables it falls back to, and shadcn's neutral theme for when neither is set.
const tokens = [
  ["background", "ui-bg", "background", "#fff", "#0a0a0a"],
  ["foreground", "ui-text-highlighted", "foreground", "#0a0a0a", "#fafafa"],
  ["muted", "ui-text-muted", "muted-foreground", "#737373", "#a1a1a1"],
  ["border", "ui-border", "border", "#e5e5e5", "rgb(255 255 255/.1)"],
  ["accent", "ui-bg-elevated", "accent", "#f5f5f5", "#262626"],
  ["ring", "ui-primary", "ring", "#a1a1a1", "#737373"],
] as const;

// Status colors, for the blocks that report good, bad, careful, or neutral news. Danger is shadcn's `--destructive`
// too, and success reads the `--success` that many shadcn themes add.
const colors = {
  success: ["success", "ui-success", "success", "#259f56", "#59d38c"],
  danger: ["danger", "ui-error", "destructive", "#ee3533", "#fd736d"],
  warning: ["warning", "ui-warning", "", "#d97706", "#fbbf24"],
  info: ["info", "ui-info", "", "#2563eb", "#60a5fa"],
} as const;
const status = Object.values(colors);

// The shadow under a popover, menu, or card that floats over the page. Flat blocks use a border alone.
const shadow = [
  ["shadow", "", "", "0 4px 12px rgb(0 0 0/.12)", "0 4px 12px rgb(0 0 0/.5)"],
] as const;

type Token = readonly [string, string, string, string, string];

export type Extras = "status" | "shadow";

const groups: Record<Extras, readonly Token[]> = { status, shadow };

const chain = (token: Token, scheme: 3 | 4) => {
  const shadcn = token[2] ? `var(--${token[2]},${token[scheme]})` : token[scheme];
  const nuxt = token[1] ? `var(--${token[1]},${shadcn})` : shadcn;
  return `var(--comark-${token[0]},${nuxt})`;
};

const resolve = (list: readonly Token[], scheme: 3 | 4) =>
  list.map((token) => `--_comark-${token[0]}:${chain(token, scheme)}`).join(";");

/**
 * A status color for an element that no `theme()` rule reaches, such as a table cell with no wrapper: the same
 * fallbacks as `--_comark-<name>`, in the light shade.
 */
export function statusColor(name: keyof typeof colors): string {
  return chain(colors[name], 3);
}

/**
 * Resolves the `--comark-*` tokens on `selector`, falling back to Nuxt UI's variables, then shadcn/ui's, then shadcn's
 * neutral theme. Nuxt UI's corners are twice its `--ui-radius`, so the radius halves shadcn's to double it back.
 * They resolve on the component rather than `:root`, so a `.dark` class anywhere above it switches the theme, and a
 * `--comark-*` set on any ancestor still inherits down. `:where()` keeps them at zero specificity.
 *
 * Every block gets the core tokens. Name `"status"` for `--comark-success`, `-danger`, `-warning`, and `-info`, and
 * `"shadow"` for `--comark-shadow`, so a block that never draws them doesn't carry them.
 */
export function theme(selector: string, ...extras: Extras[]): string {
  const where = `:where(${selector})`;
  const added = extras.flatMap((name) => groups[name]);
  const list: Token[] = [...tokens, ...added];
  // Few themes define dark status colors, so a `.light` or `.dark` class above the block picks their fallbacks too.
  const classes = added.length
    ? `:where(.light) ${where}{${resolve(added, 3)}}:where(.dark) ${where}{${resolve(added, 4)}}`
    : "";
  return (
    `${where}{${resolve(list, 3)};--_comark-radius:var(--comark-radius,calc(var(--ui-radius,calc(var(--radius,.625rem)/2))*2));--_comark-font:var(--comark-font,var(--font-sans,ui-sans-serif,system-ui,sans-serif))}` +
    `@media (prefers-color-scheme:dark){${where}{${resolve(list, 4)}}}` +
    classes
  );
}
