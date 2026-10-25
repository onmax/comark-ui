---
title: Theming
description: One set of --comark-* tokens themes every plugin, on top of Nuxt UI's or shadcn/ui's variables.
keywords: CSS, colors, dark mode, light mode, CSS variables, custom properties, shadcn, Tailwind, styles, theme, Nuxt UI
tagline: The blocks match a Nuxt UI or shadcn/ui site as it is. Elsewhere, eight tokens theme them all at once.
---

This page shows how the blocks pick up your site's theme, how to change it with the `--comark-*` tokens, and how to carry a Nuxt UI app's theme to a page rendered outside the app.

## Nuxt UI and shadcn/ui

Every plugin reads the CSS variables of [Nuxt UI](https://ui.nuxt.com) and [shadcn/ui](https://ui.shadcn.com). On a site built with either one, the blocks match it with no CSS of your own, and a `.dark` class anywhere above a block switches it to dark mode. On a site with neither, they use shadcn's neutral theme and follow the system's light or dark mode.

When a site sets both, Nuxt UI's variables win.

### Nuxt UI

The blocks follow the app's `app.config` colors, its `--ui-radius`, and its color mode:

- Surfaces, text, and borders read `--ui-bg`, `--ui-text-highlighted`, `--ui-text-muted`, `--ui-border`, and `--ui-bg-elevated`. The table under [Tokens](#tokens) maps each one.
- Brand colors, such as a primary badge or an error card, read `--ui-primary`, `--ui-success`, `--ui-error`, and the rest.
- Chart series read `--ui-chart-1` to `-6`.
- Focus rings use `--ui-primary`, like Nuxt UI's own components.
- Corners are twice `--ui-radius`.

To render the blocks somewhere the app's stylesheet isn't loaded, see [Outside a Nuxt UI app](#outside-a-nuxt-ui-app).

### shadcn/ui

shadcn/ui before Tailwind 4 stores colors as bare HSL numbers, which the blocks can't read. Map those through the tokens below: `--comark-border: hsl(var(--border))`.

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

## Outside a Nuxt UI app

A review document, a static export, or an email built by a script doesn't load the app's stylesheet. The `--ui-*` variables are missing there, so the blocks fall back to shadcn's neutral theme. `nuxtUiTheme()` from `comark-ui/nuxt-ui` writes those variables from your app's theme. Put its CSS on the page and the blocks match the app again.

### Pass the app's theme

Pass the colors your `app.config.ts` sets under `ui.colors`, and the source of the CSS file that imports `@nuxt/ui`:

```ts
import { readFile } from "node:fs/promises";
import { createHtmlRenderer } from "@comark/html";
import comarkUi from "comark-ui/html";
import { nuxtUiTheme } from "comark-ui/nuxt-ui";

const { css, issues } = nuxtUiTheme({
  colors: { primary: "indigo", neutral: "zinc" },
  css: await readFile("app/assets/css/main.css", "utf8"),
});

const render = createHtmlRenderer(comarkUi());
const page = `<style>${css}</style>${await render(markdown)}`;
```

> [!NOTE]
> Copy the colors instead of importing `app.config.ts`. It calls `defineAppConfig()`, which only exists inside a Nuxt build.

Both options are optional. With neither, you get Nuxt UI's default theme: a green primary on slate.

### What it reads

| Source | What it takes |
| --- | --- |
| `colors` | Each color's shades, from Tailwind's palette or from the `--color-<name>-50` to `-950` your CSS defines |
| `@theme` in `css` | Your own palettes, any Tailwind shades you override, and `--font-sans` |
| `:root`, `.light`, and `.dark` in `css` | Every `--ui-*` variable you set there, such as `--ui-primary: var(--ui-color-primary-700)` or `--ui-radius` |

It skips the rest of the file. It doesn't load fonts either: if `--font-sans` names a web font, the page needs its `@font-face`, or the text falls back to the next font in the list.

### Light and dark

The CSS sets light mode on `:root` and `.light`, and dark mode on `.dark`. With neither class on the page, it follows the system, like a Nuxt app with the default color mode. It all sits in a `theme` layer, so any plain rule of your own wins.

### Issues

`issues` lists what it couldn't resolve, one sentence each. The CSS leaves those colors out, and the blocks use their defaults for them:

- A color in `colors` that isn't in Tailwind's palette and has no shades in your CSS's `@theme`, such as `primary: "brand"` without `--color-brand-50` to `-950`.
- A `var(--color-…)` that one of your `--ui-*` values reads and nothing defines.

## Each plugin's own

Each package's own variables and class names are on its Theming page: [annotate](/annotate/#theme), [carousel](/carousel/#theme), [charts](/charts/#theme), [chips](/chips/#theme), [code](/code/#theme), [diff](/diff/#theme), [embed](/embed/#theme), [github](/github/#theme), [icon](/icon/#theme), [tabs](/tabs/#theme), and [zoom](/zoom/#theme).
