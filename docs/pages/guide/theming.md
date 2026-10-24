---
title: Theming
description: One set of --comark-* tokens themes every plugin, on top of shadcn/ui's variables.
keywords: CSS, colors, dark mode, light mode, CSS variables, custom properties, shadcn, Tailwind, styles, theme, Nuxt UI
tagline: The plugins follow shadcn/ui. On a site that uses its variables they match with no setup; elsewhere, eight tokens theme them all at once.
---

## shadcn/ui

The styles follow [shadcn/ui](https://ui.shadcn.com). On a site that already uses its CSS variables, every plugin matches it with no setup, and a `.dark` class anywhere above a block switches the theme. Elsewhere they use shadcn's neutral theme and follow the system's light or dark mode.

shadcn/ui before Tailwind 4 stores colors as bare HSL numbers, so map those through the tokens below: `--comark-border: hsl(var(--border))`.

## Tokens

Set the `--comark-*` tokens to theme annotate, carousel, charts, chips, code, diff, embed, github, tabs, and zoom at once. Each one wins over its shadcn variable, and works on `:root` or on any ancestor:

| Token | Falls back to | Used for |
| --- | --- | --- |
| `--comark-background` | `--background` | Button faces, the zoom backdrop, the ring around stamps, cards |
| `--comark-foreground` | `--foreground` | Text, icons, the current thumbnail, slide panels |
| `--comark-muted` | `--muted-foreground` | Counters, hosts under players, diff line numbers |
| `--comark-border` | `--border` | Button, thumbnail, screenshot, player, callout, and diff borders |
| `--comark-accent` | `--accent` | Hovered buttons, the diff header |
| `--comark-ring` | `--ring` | Focus rings, the edge of a highlighted diff line |
| `--comark-radius` | `--radius` | Corners, a little smaller on buttons and images |
| `--comark-font` | `--font-sans` | The zoomed view's header, callouts, and the links under players |

```css
:root {
  --comark-accent: oklch(0.95 0.03 250);
  --comark-radius: 0.25rem;
}
```

Try them in the [playground's Theme pane](/play/): it shows them in light and dark and copies the CSS for what you change.

To theme one part only, set the tokens on its root instead: `.ca` for annotate, `.cc` for a carousel, `.cch` for charts, `.cp` for chips, `.ck` for code headers, `.cd` for diffs, `.ce` and `.ce-card` for embeds, `.cgc` for callouts, `.ct` for tabs, and `.cz-dialog` for the zoomed view.

## Your own rules

The rules sit in a `comark` CSS layer, so any plain rule of your own wins without `!important`, such as `.cc-step { border-radius: 0 }`.

## Nuxt UI

[Nuxt UI](https://ui.nuxt.com) names its variables differently. Map them once:

```css
:root {
  --comark-background: var(--ui-bg);
  --comark-foreground: var(--ui-text-highlighted);
  --comark-muted: var(--ui-text-muted);
  --comark-border: var(--ui-border);
  --comark-accent: var(--ui-bg-elevated);
  --comark-ring: var(--ui-primary);
  --comark-radius: calc(var(--ui-radius) * 2);
}
```

## Each plugin's own

Each package's own variables and class names are on its Theming page: [annotate](/annotate/#theme), [carousel](/carousel/#theme), [charts](/charts/#theme), [chips](/chips/#theme), [code](/code/#theme), [diff](/diff/#theme), [embed](/embed/#theme), [github](/github/#theme), [icon](/icon/#theme), [tabs](/tabs/#theme), and [zoom](/zoom/#theme).
