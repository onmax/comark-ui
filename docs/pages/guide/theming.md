---
title: Theming
description: One set of --comark-* tokens themes every plugin, on top of Nuxt UI's or shadcn/ui's variables.
keywords: CSS, colors, dark mode, light mode, CSS variables, custom properties, shadcn, Tailwind, styles, theme, Nuxt UI
tagline: The blocks match a Nuxt UI or shadcn/ui site as it is. Elsewhere, a dozen tokens theme them all at once.
---

Change the theme with the `--comark-*` tokens, or carry a Nuxt UI app's theme to a page rendered outside the app.

## Nuxt UI and shadcn/ui

Every plugin reads the CSS variables of [Nuxt UI](https://ui.nuxt.com) and [shadcn/ui](https://ui.shadcn.com). On a site built with either, the blocks match with no CSS of your own, and a `.dark` class on any ancestor switches them to dark mode. On a site with neither, they use shadcn's neutral theme and follow the system's color mode.

If a site sets both, Nuxt UI's variables win.

### Nuxt UI

The blocks follow the app's `app.config` colors, its `--ui-radius`, and its color mode. [Tokens](#tokens) lists the `--ui-*` variable behind each token, such as `--ui-bg` for surfaces and `--ui-success` for a passing test. Chart series read `--ui-chart-1` to `-6`. Focus rings use `--ui-primary`, like Nuxt UI's own components, and corners are twice `--ui-radius`.

Where the app's stylesheet isn't loaded, see [Outside a Nuxt UI app](#outside-a-nuxt-ui-app).

### shadcn/ui

Before Tailwind 4, shadcn/ui stores colors as bare HSL numbers, which the blocks can't read. Map them through the tokens, such as `--comark-border: hsl(var(--border))`, `--comark-primary: hsl(var(--primary))`, and `--comark-danger: hsl(var(--destructive))`.

## Tokens

The `--comark-*` tokens theme every plugin at once. Each wins over the Nuxt UI and shadcn variables, on `:root` or any ancestor:

| Token | Falls back to | Used for |
| --- | --- | --- |
| `--comark-background` | `--ui-bg`, `--background` | Button faces, the zoom backdrop, the ring around stamps, cards |
| `--comark-foreground` | `--ui-text-highlighted`, `--foreground` | Text, icons, the current thumbnail, slide panels |
| `--comark-muted` | `--ui-text-muted`, `--muted-foreground` | Counters, hosts under players, diff line numbers |
| `--comark-border` | `--ui-border`, `--border` | Button, thumbnail, screenshot, player, callout, and diff borders |
| `--comark-accent` | `--ui-bg-elevated`, `--accent` | Hovered buttons, the diff header |
| `--comark-ring` | `--ui-primary`, `--ring` | Focus rings, the edge of a highlighted diff line |
| `--comark-primary` | `--ui-primary`, `--primary`, else `--comark-foreground` | Primary badges and cards, a selected quiz option, progress bars, code note markers, the media seek bar, checkboxes |
| `--comark-primary-foreground` | `--ui-text-inverted`, `--primary-foreground`, else `--comark-background` | Text and icons on the primary color |
| `--comark-secondary` | `--ui-secondary`, else `--comark-muted` | Secondary badges and cards |
| `--comark-success` | `--ui-success`, `--success` | Passing tests, added lines, a better change, a tip |
| `--comark-danger` | `--ui-error`, `--destructive` | Failing tests, removed lines, a worse change, an error or a required field |
| `--comark-warning` | `--ui-warning` | Warnings, changed entries, a caution |
| `--comark-info` | `--ui-info` | Notes and info badges |
| `--comark-shadow` | A soft shadow, deeper in dark mode | Menus, popover cards, and slider handles. Blocks that rest on the page get a border instead |
| `--comark-radius` | twice `--ui-radius`, `--radius` | Image and code block corners. Controls, chips, and marks use a smaller radius derived from it |
| `--comark-font` | `--font-sans` | The text around the blocks, the zoomed view's header, callouts, and the links under players |

```css
:root {
  --comark-accent: oklch(0.95 0.03 250);
  --comark-radius: 0.25rem;
}
```

The [playground's Theme pane](/play/) shows them in light and dark and copies the CSS for what you change.

To theme one part, set the tokens on its root: `.ca` for annotate, `.cc` for a carousel, `.cch` for charts, `.cp` for chips, `.ck` for code headers, `.cd` for diffs, `.ce` and `.ce-card` for embeds, `.cgc` for callouts, `.ct` for tabs, and `.cz-dialog` for the zoomed view.

The same tokens color the text around the blocks. [Typeset](/guide/typeset/) lists its own variables for size, spacing, and fonts.

## Your own rules

The plugins' rules sit in a `comark` CSS layer, so a plain rule of yours wins without `!important`, such as `.cc-step { border-radius: 0 }`.

## Outside a Nuxt UI app

A review document, static export, or email built by a script doesn't load the app's stylesheet, so the blocks fall back to shadcn's neutral theme. `nuxtUiTheme()` from `comark-ui/nuxt-ui` writes the `--ui-*` variables from your app's theme. Put its CSS on the page and the blocks match the app.

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

Both options are optional. With neither, you get Nuxt UI's default theme, a green primary on slate.

### What it reads

| Source | What it takes |
| --- | --- |
| `colors` | Each color's shades, from Tailwind's palette or from the `--color-<name>-50` to `-950` your CSS defines |
| `@theme` in `css` | Your own palettes, any Tailwind shades you override, and `--font-sans` |
| `:root`, `.light`, and `.dark` in `css` | Every `--ui-*` variable you set there, such as `--ui-primary: var(--ui-color-primary-700)` or `--ui-radius` |

It skips the rest of the file and loads no fonts. If `--font-sans` names a web font, add its `@font-face` to the page, or the text falls back to the next font in the list.

### Light and dark

The CSS sets light mode on `:root` and `.light`, and dark mode on `.dark`. With neither class, it follows the system, like a Nuxt app's default color mode. It sits in a `theme` layer, so a plain rule of yours wins.

### Issues

`issues` lists what it couldn't resolve, one sentence each. The CSS leaves those colors out, so the blocks use their defaults:

- A color in `colors` that isn't in Tailwind's palette and has no shades in your CSS's `@theme`, such as `primary: "brand"` without `--color-brand-50` to `-950`.
- A `var(--color-…)` that one of your `--ui-*` values reads and nothing defines.

## Each plugin's own

Each package's page lists its own variables and class names: [annotate](/annotate/#theme), [carousel](/carousel/#theme), [charts](/charts/#theme), [chips](/chips/#theme), [code](/code/#theme), [diff](/diff/#theme), [embed](/embed/#theme), [github](/github/#theme), [icon](/icon/#theme), [tabs](/tabs/#theme), and [zoom](/zoom/#theme).
