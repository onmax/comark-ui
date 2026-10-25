import { palette } from "./palette.ts";

export type NuxtUiTheme = {
  /** `ui.colors` from the app's `app.config.ts`, such as `{ primary: "indigo", neutral: "zinc" }`. */
  colors?: Record<string, string | undefined>;
  /** The app's main CSS file: its `@theme` colors and fonts, and the `--ui-*` variables its `:root` and `.dark` set. */
  css?: string;
};

const paletteByName = new Map(Object.entries(palette));
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Nuxt UI 4.12's defaults, from its module and `runtime/index.css`.
const defaultColors = {
  primary: "green",
  secondary: "blue",
  success: "green",
  info: "blue",
  warning: "yellow",
  error: "red",
  neutral: "slate",
};
const light = {
  "text-dimmed": "var(--ui-color-neutral-400)",
  "text-muted": "var(--ui-color-neutral-500)",
  "text-toned": "var(--ui-color-neutral-600)",
  text: "var(--ui-color-neutral-700)",
  "text-highlighted": "var(--ui-color-neutral-900)",
  "text-inverted": "#fff",
  bg: "#fff",
  "bg-muted": "var(--ui-color-neutral-50)",
  "bg-elevated": "var(--ui-color-neutral-100)",
  "bg-accented": "var(--ui-color-neutral-200)",
  "bg-inverted": "var(--ui-color-neutral-900)",
  border: "var(--ui-color-neutral-200)",
  "border-muted": "var(--ui-color-neutral-200)",
  "border-accented": "var(--ui-color-neutral-300)",
  "border-inverted": "var(--ui-color-neutral-900)",
};
const dark = {
  "text-dimmed": "var(--ui-color-neutral-500)",
  "text-muted": "var(--ui-color-neutral-400)",
  "text-toned": "var(--ui-color-neutral-300)",
  text: "var(--ui-color-neutral-200)",
  "text-highlighted": "#fff",
  "text-inverted": "var(--ui-color-neutral-900)",
  bg: "var(--ui-color-neutral-900)",
  "bg-muted": "var(--ui-color-neutral-800)",
  "bg-elevated": "var(--ui-color-neutral-800)",
  "bg-accented": "var(--ui-color-neutral-700)",
  "bg-inverted": "#fff",
  border: "var(--ui-color-neutral-800)",
  "border-muted": "var(--ui-color-neutral-700)",
  "border-accented": "var(--ui-color-neutral-700)",
  "border-inverted": "#fff",
};
const charts = ["blue", "violet", "amber", "rose", "cyan"];

/**
 * Rebuilds a Nuxt UI app's `--ui-*` variables from its `app.config` colors and main CSS, for a page that renders
 * Comark outside the app, such as a review document. The plugins read those variables, so the page matches the app.
 * Light mode sits on `:root` and `.light`, dark on `.dark` and on a system in dark mode, all in the `theme` layer.
 */
export function nuxtUiTheme(theme: NuxtUiTheme = {}): { css: string; issues: string[] } {
  const issues: string[] = [];
  const source = read(theme.css ?? "");
  const colors = { ...defaultColors, ...definedColors(theme.colors) };

  // Nuxt UI renames Tailwind's neutral to old-neutral, since its own neutral follows `ui.colors.neutral`.
  const shade = (name: string, step: number) => {
    const value = paletteByName.get(name)?.[shades.indexOf(step)];
    return (
      source.theme.get(`--color-${name === "neutral" ? "old-neutral" : name}-${step}`) ??
      (value ? `oklch(${value})` : undefined)
    );
  };

  const root = new Map<string, string>([["--ui-radius", ".25rem"]]);
  for (const [key, name] of Object.entries(colors)) {
    if (!shades.every((step) => shade(name, step))) {
      issues.push(
        `Nuxt UI color "${key}" is "${name}", which is neither a Tailwind color nor defined as --color-${name}-50 to -950 in the CSS: pass the CSS with its @theme shades, or pick a Tailwind color.`,
      );
      continue;
    }
    for (const step of shades) root.set(`--ui-color-${key}-${step}`, shade(name, step)!);
  }
  const font = source.theme.get("--font-sans");
  if (font) root.set("--font-sans", font);

  const scheme = (base: Record<string, string>, step: 500 | 400, own: Map<string, string>) => {
    const vars = new Map<string, string>();
    for (const key of Object.keys(colors))
      if (key !== "neutral") vars.set(`--ui-${key}`, `var(--ui-color-${key}-${step})`);
    for (const [key, value] of Object.entries(base)) vars.set(`--ui-${key}`, value);
    vars.set("--ui-chart-1", "var(--ui-primary)");
    charts.forEach((name, index) =>
      vars.set(`--ui-chart-${index + 2}`, `var(--color-${name}-${step})`),
    );
    for (const [name, value] of source.root) vars.set(name, value);
    for (const [name, value] of own) vars.set(name, value);
    return vars;
  };
  const lightVars = scheme(light, 500, source.light);
  const darkVars = scheme(dark, 400, source.dark);

  // The app's own values may read Tailwind's `--color-*` variables, which a page outside the app doesn't have.
  const pending = [...root.values(), ...lightVars.values(), ...darkVars.values()];
  while (pending.length) {
    for (const [, name] of pending.pop()!.matchAll(/var\((--color-[\w-]+)/g)) {
      if (root.has(name!)) continue;
      const match = /^--color-(.+)-(\d+)$/.exec(name!);
      const value =
        source.theme.get(name!) ??
        (match
          ? shade(match[1]!, Number(match[2]))
          : { "--color-white": "#fff", "--color-black": "#000" }[name!]);
      if (!value) {
        issues.push(
          `Nuxt UI theme reads ${name}, which is neither a Tailwind color nor defined in the CSS's @theme: define it there, or use a Tailwind color.`,
        );
        root.set(name!, "initial");
        continue;
      }
      root.set(name!, value);
      pending.push(value);
    }
  }

  const block = (selector: string, vars: Map<string, string>) =>
    `${selector}{${[...vars].map(([name, value]) => `${name}:${value}`).join(";")}}`;
  const css =
    `@layer theme{${block(":root", root)}${block(":root,.light", lightVars)}${block(".dark", darkVars)}` +
    `@media (prefers-color-scheme:dark){${block(":root:not(.light)", darkVars)}}}`;
  return { css, issues };
}

function definedColors(colors: NuxtUiTheme["colors"] = {}) {
  return Object.fromEntries(
    Object.entries(colors).filter((entry): entry is [string, string] => !!entry[1]),
  );
}

// Reads only what Nuxt UI's theming uses: `@theme` declarations, and the `--ui-*` ones in light and dark rules.
function read(css: string) {
  const blocks = {
    theme: new Map<string, string>(),
    root: new Map<string, string>(),
    light: new Map<string, string>(),
    dark: new Map<string, string>(),
  };
  for (const [, selector, body] of css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .matchAll(/([^{};]*)\{([^{}]*)\}/g)) {
    const kind = /@theme\b/.test(selector!)
      ? "theme"
      : /\.dark\b/.test(selector!)
        ? "dark"
        : /:root|:host|^\s*html\s*$/.test(selector!)
          ? "root"
          : /\.light\b/.test(selector!)
            ? "light"
            : undefined;
    if (!kind) continue;
    for (const [, name, value] of body!.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g))
      if (kind === "theme" || name!.startsWith("--ui-")) blocks[kind].set(name!, value!.trim());
  }
  return blocks;
}
