// The playground's Theme pane: the shared `--comark-*` tokens, its presets, and the CSS it copies. No DOM here, so the
// build can write the pane's markup from the same lists.
export const colorTokens = [
  "background",
  "foreground",
  "muted",
  "border",
  "accent",
  "ring",
] as const;
export const tokens = [...colorTokens, "radius", "font"] as const;
export type Token = (typeof tokens)[number];

export type Theme = {
  preset: string;
  tokens: Partial<Record<Token, string>>;
  css: string;
  scheme?: "light" | "dark";
};

// Nuxt UI's own defaults stand in for a Nuxt UI app, which the plugins follow with no tokens set.
const nuxtDefaults = `/* Nuxt UI's defaults, which a Nuxt UI app already has */
:root {
  --ui-radius: 0.25rem;
  --ui-primary: oklch(72.3% 0.219 149.579);
  --ui-bg: #fff;
  --ui-bg-elevated: oklch(96.8% 0.007 247.896);
  --ui-border: oklch(92.9% 0.013 255.508);
  --ui-text-muted: oklch(55.4% 0.046 257.417);
  --ui-text-highlighted: oklch(20.8% 0.042 265.755);
}
.dark {
  --ui-primary: oklch(79.2% 0.209 151.711);
  --ui-bg: oklch(20.8% 0.042 265.755);
  --ui-bg-elevated: oklch(27.9% 0.041 260.031);
  --ui-border: oklch(27.9% 0.041 260.031);
  --ui-text-muted: oklch(70.4% 0.04 256.788);
  --ui-text-highlighted: #fff;
}`;

export const themePresets: { id: string; label: string; tokens: Theme["tokens"]; css: string }[] = [
  { id: "shadcn", label: "shadcn", tokens: {}, css: "" },
  {
    id: "nuxt-ui",
    label: "Nuxt UI",
    tokens: {},
    css: nuxtDefaults,
  },
  {
    id: "violet",
    label: "Violet",
    tokens: {
      background: "light-dark(#f5f3ff, #2e1065)",
      foreground: "light-dark(#2e1065, #f5f3ff)",
      muted: "light-dark(#6d28d9, #c4b5fd)",
      border: "light-dark(#ddd6fe, #5b21b6)",
      accent: "light-dark(#ede9fe, #4c1d95)",
      ring: "light-dark(#8b5cf6, #a78bfa)",
      radius: "1rem",
    },
    css: "",
  },
];

export const defaultTheme = (): Theme => ({ preset: "shadcn", tokens: {}, css: "" });

/** The CSS a reader copies: a `:root` block of the tokens they set, then their own CSS. */
export function themeCss(theme: Theme) {
  const lines = tokens.flatMap((token) =>
    theme.tokens[token] ? [`  --comark-${token}: ${theme.tokens[token]};`] : [],
  );
  // light-dark() picks its side from color-scheme, which a page has to opt into.
  if (lines.some((line) => line.includes("light-dark(")))
    lines.unshift("  color-scheme: light dark;");
  return [lines.length ? `:root {\n${lines.join("\n")}\n}` : "", theme.css.trim()]
    .filter(Boolean)
    .join("\n\n");
}

/** Reads a theme from a shared link, keeping only what the pane can show. */
export function readTheme(value: unknown): Theme {
  const theme = defaultTheme();
  if (typeof value !== "object" || value === null) throw new Error("Not a theme.");
  const record = value as Record<string, unknown>;
  if (themePresets.some((preset) => preset.id === record.preset))
    theme.preset = String(record.preset);
  if (typeof record.css === "string") theme.css = record.css;
  if (record.scheme === "light" || record.scheme === "dark") theme.scheme = record.scheme;
  const set = typeof record.tokens === "object" && record.tokens !== null ? record.tokens : {};
  for (const token of tokens) {
    const tokenValue = (set as Record<string, unknown>)[token];
    if (typeof tokenValue === "string" && tokenValue.trim()) theme.tokens[token] = tokenValue;
  }
  return theme;
}
