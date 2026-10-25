---
title: Theming
description: One set of --comark-* tokens themes every plugin, on top of Nuxt UI's or shadcn/ui's variables.
keywords: CSS, colors, dark mode, light mode, CSS variables, custom properties, shadcn, Tailwind, styles, theme, Nuxt UI
tagline: The plugins follow Nuxt UI and shadcn/ui. On a site that uses either one's variables they match with no setup; elsewhere, eight tokens theme them all at once.
---

## shadcn/ui

The styles follow [shadcn/ui](https://ui.shadcn.com). On a site that already uses its CSS variables, every plugin matches it with no setup, and a `.dark` class anywhere above a block switches the theme. Elsewhere they use shadcn's neutral theme and follow the system's light or dark mode.

shadcn/ui before Tailwind 4 stores colors as bare HSL numbers, so map those through the tokens below: `--comark-border: hsl(var(--border))`.

## Tokens

Set the `--comark-*` tokens to theme annotate, carousel, charts, chips, code, diff, embed, github, tabs, and zoom at once. Each one wins over the Nuxt UI and shadcn variables, and works on `:root` or on any ancestor:

| Token | Falls back to | Used for |
| --- | --- | --- |
| `--comark-background` | `--ui-bg`, `--background` | Button faces, the zoom backdrop, the ring around stamps, cards |
| `--comark-foreground` | `--ui-text-highlighted`, `--foreground` | Text, icons, the current thumbnail, slide panels |
| `--comark-muted` | `--ui-text-muted`, `--muted-foreground` | Counters, hosts under players, diff line numbers |
| `--comark-border` | `--ui-border`, `--border` | Button, thumbnail, screenshot, player, callout, and diff borders |
| `--comark-accent` | `--ui-bg-elevated`, `--accent` | Hovered buttons, the diff header |
| `--comark-ring` | `--ui-primary`, `--ring` | Focus rings, the edge of a highlighted diff line |
| `--comark-radius` | twice `--ui-radius`, `--radius` | Image and code block corners; some controls use a smaller radius |
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

In a [Nuxt UI](https://ui.nuxt.com) app, the plugins read its `--ui-*` variables, so they follow its `app.config` colors, its radius, and its color mode with no setup. Brand colors come from them too: `--ui-primary`, `--ui-success`, `--ui-error`, and the rest, and chart series from `--ui-chart-1` to `-6`.

A page that renders Comark outside the app, such as a review document or a static export, has none of those variables. `nuxtUiTheme()` from `comark-ui/nuxt-ui` rebuilds them from the app's `ui.colors` and its main CSS, where it reads the `@theme` colors and fonts and the `--ui-*` values the app's `:root` and `.dark` set:

```ts
import { readFile } from "node:fs/promises";
import { nuxtUiTheme } from "comark-ui/nuxt-ui";
import appConfig from "./app/app.config";

const { css, issues } = nuxtUiTheme({
  colors: appConfig.ui?.colors,
  css: await readFile("app/assets/css/main.css", "utf8"),
});
const page = `<style>${css}</style>${body}`;
```

The CSS sets light mode on `:root` and `.light`, and dark mode on `.dark` and on a system in dark mode, all in a `theme` layer. `issues` names each color it can't resolve, such as an `app.config` color whose shades aren't in the CSS passed in.

## Each plugin's own

Each package's own variables and class names are on its Theming page: [annotate](/annotate/#theme), [carousel](/carousel/#theme), [charts](/charts/#theme), [chips](/chips/#theme), [code](/code/#theme), [diff](/diff/#theme), [embed](/embed/#theme), [github](/github/#theme), [icon](/icon/#theme), [tabs](/tabs/#theme), and [zoom](/zoom/#theme).
