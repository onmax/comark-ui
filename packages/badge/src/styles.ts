import { theme } from "comark-zoom/theme";

/**
 * Badges in Nuxt UI's subtle style: a tint of their color, a ring a little stronger, and text in the color. Each color
 * reads Nuxt UI's `--ui-*` variable when the page has it, so badges match the app, then `--cb-*`. Primary and error fall
 * back to shadcn/ui's `--primary` and `--destructive`, primary then to the foreground and secondary to the muted text,
 * so a badge is neutral like the other plugins until the page has a brand color. Both complete colors and legacy bare
 * HSL component variables are supported. The rules sit in the
 * `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cb"),
  ".cb-image{display:inline-block;height:26px;max-width:100%;object-fit:contain;vertical-align:middle;margin:0}",
  ":where(.cb){--cb-primary:var(--ui-primary,var(--primary,var(--_comark-foreground)));--cb-secondary:var(--ui-secondary,var(--_comark-muted));--cb-success:var(--ui-success,#16a34a);--cb-info:var(--ui-info,#2563eb);--cb-warning:var(--ui-warning,#ca8a04);--cb-error:var(--ui-error,var(--destructive,#dc2626));--cb-neutral:var(--_comark-muted)}",
  "@media (prefers-color-scheme:dark){:where(.cb){--cb-success:var(--ui-success,#4ade80);--cb-info:var(--ui-info,#60a5fa);--cb-warning:var(--ui-warning,#facc15);--cb-error:var(--ui-error,var(--destructive,#f87171))}}",
  ".cb{--cb:var(--cb-primary);display:inline-flex;align-items:center;gap:.25rem;padding:.0625rem .375rem;border-radius:calc(var(--_comark-radius) - 4px);background:color-mix(in srgb,var(--cb) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cb) 25%,transparent);color:color-mix(in srgb,var(--cb) 85%,var(--_comark-foreground));font:500 .75rem/1rem var(--_comark-font);vertical-align:middle;white-space:nowrap}",
  ...["secondary", "success", "info", "warning", "error", "neutral"].map(
    (color) => `.cb[data-color='${color}']{--cb:var(--cb-${color})}`,
  ),
  ".cb[data-color='neutral']{color:var(--_comark-foreground)}",
  ".cb code{padding:0;background:none;font-size:inherit}",
  // A badge in a heading sits on the heading's line, not above it.
  ":is(h1,h2,h3,h4,h5,h6) .cb{margin-inline-start:.25rem;vertical-align:.125em}",
  "@media (forced-colors:active){.cb{border:1px solid}}",
].join("")}}`;
