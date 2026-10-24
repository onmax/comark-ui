---
title: Colors
description: Color swatches next to inline code and palettes of named colors, written in Markdown.
keywords: color swatch, swatch, hex, rgb, hsl, oklch, palette, design tokens, color preview
tagline: Write a color in inline code and readers see it, as GitLab shows it. Put named colors in a palette and get a grid of swatches.
group: Review blocks
icon: palette
blurb: Swatches for colors in code
credits: 'After <a href="https://docs.gitlab.com/user/markdown/#colors">GitLab</a>''s color chips and <a href="https://www.mintlify.com/docs/components/color">Mintlify</a>''s Color.'
---

::examples
:::example{label="Inline"}
```md
The button moves from `#3b82f6` to `oklch(0.55 0.2 264)`, and its hover from `rgb(37 99 235)` to `hsl(226 71% 40%)`.
```
:::

:::example{label="Palette"}
```md
::palette
- Background: `#fafaf9`
- Foreground: `#1c1917`
- Primary: `oklch(0.55 0.2 264)`
- Danger: `#dc2626`
- Overlay: `rgb(0 0 0 / 40%)`
::
```
:::
::

There's no new syntax for a single color: any inline code that holds exactly one hex, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, or `oklch()` color gets a swatch before it, and the document still reads the same without the plugin. A swatch sits on a checkerboard, so a translucent color shows as translucent.

## Usage

### Inline code

```md
Links use `#3b82f6`, and visited ones `oklch(0.5 0.2 300 / 90%)`.
```

Inline code that holds one color and nothing else gets a swatch before it. Code blocks are left alone, and so is inline code with anything else in it, such as `` `color: #fff` ``.

| Form | Examples |
| --- | --- |
| Hex | `#fff`, `#ffff`, `#3b82f6`, `#3b82f680` |
| `rgb()`, `rgba()` | `rgb(59 130 246)`, `rgb(59 130 246 / 50%)`, `rgba(59, 130, 246, .5)` |
| `hsl()`, `hsla()`, `hwb()` | `hsl(217deg 91% 60%)`, `hwb(217 23% 4%)` |
| `lab()`, `lch()`, `oklab()`, `oklch()` | `lab(54.6 8.6 -65.7)`, `oklch(0.62 0.19 260)` |

Named colors such as `red` aren't read, since a word in code is far more often a name in a program than a color. Nor are `var()`, `color()`, and `color-mix()`, whose color depends on the page.

### Palette

```md
::palette
- Primary: `#3b82f6`
- Danger: #dc2626
::
```

A `::palette` holds one list, bulleted or numbered, of `name: color` lines, and draws each as a tile with its name and its value. The color can be in inline code or not. Close the block with `::`.

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a palette with no list, content beside the list (it's dropped), a line with no name or color, a color it can't draw (the line is left out), and a prop, which a palette doesn't have. Each issue names its palette and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Review a theme change

A pull request that changes design tokens reads best with the old and new values side by side. Write them in inline code and each one shows its color:

```md
| Token | Before | After |
| --- | --- | --- |
| `--primary` | `#3b82f6` | `oklch(0.55 0.2 264)` |
| `--ring` | `#93c5fd` | `oklch(0.7 0.12 260)` |
```

For the whole set, a `::palette` per theme shows them as a reviewer would see them on a page.

## API

The plugin takes no options. In `comarkUi()`, `colors: false` turns it off.

### isColor()

Every entry also exports `isColor()`, the test the plugin runs on inline code, for a host that wants to check a value the same way.

### Package

[comark-ui](/getting-started/) brings `comark-colors` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-colors
```

```ts
import { createHtmlRenderer } from "@comark/html";
import colors, { components } from "comark-colors/html";

const render = createHtmlRenderer({ plugins: [colors()], components });
```

For Vue, React, or Svelte, import from `comark-colors/vue`, `comark-colors/react`, or `comark-colors/svelte`; the components add the styles when they mount. Import `comark-colors/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Swatches and tiles read the [shared tokens](/guide/theming/): `--comark-border` for their outlines, `--comark-background` and `--comark-foreground` for a tile's card, `--comark-muted` for its value and, mixed with `--comark-background`, the checkerboard under a translucent color, `--comark-radius` for its corners, and `--comark-font` for its name. The value is in the system's monospace font. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

| Variable | Default | Used for |
| --- | --- | --- |
| `--cco-tile-width` | `9rem` | The narrowest a palette's tile gets before the grid wraps |
| `--cco-tile-height` | `4rem` | The height of a tile's color |

| Class | Element |
| --- | --- |
| `.cco` | Inline code that holds a color |
| `.cco-swatch` | The swatch before it, with its color in `--cco` |
| `.cco-palette` | A palette's list |
| `.cco-tile` | A tile's color, in `--cco` |
| `.cco-name`, `.cco-value` | A tile's name and value |

Swatches print with their colors, since a swatch is nothing but its background.
