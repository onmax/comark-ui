# Color swatches

comark-colors puts a swatch before inline code that holds one color, and draws a `::palette` of named colors as a grid of tiles. Use it when a change touches colors, such as design tokens or a theme, so the reviewer sees each value.

## Syntax

```md
| Token | Before | After |
| --- | --- | --- |
| `--primary` | `#3b82f6` | `oklch(0.55 0.2 264)` |
| `--ring` | `#93c5fd` | `oklch(0.7 0.12 260)` |

::palette
- Background: `#fafaf9`
- Foreground: `#1c1917`
- Primary: `oklch(0.55 0.2 264)`
- Overlay: `rgb(0 0 0 / 40%)`
::
```

- Inline code that holds one color and nothing else gets a swatch, in text, a table, or a list. A translucent color sits on a checkerboard.
- It reads hex colors of 3, 4, 6, or 8 digits and the CSS functions `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `lab()`, `lch()`, `oklab()`, and `oklch()`, alpha included.
- `::palette` holds a list, bulleted or numbered, of `name: color` lines, with the color in inline code or not. Each line becomes a tile with its name and value. It takes no props.
- `meta.issues` reports a palette with no list, a line with no name or color, a color it can't draw, and content beside the list. The palette leaves out that line and drops that content.

## Show a color change

Put the old and new values side by side in a table, one token per row, as above, and give each theme its own `::palette` to show the whole set. Write each color as hex or one of the functions above, alone in its code span. In inline code, anything else stays plain code and nothing reports it: a named color such as `red`, `var(--primary)`, `color-mix()`, or a span with more in it, such as `` `color: #fff` ``. Code blocks never get swatches.

## Register

- In `comark-ui`: on. It takes no options.
- Alone: `pnpm add comark @comark/html comark-colors`, then `createHtmlRenderer({ plugins: [colors()], components })` with both from `comark-colors/html`. `comark-colors/vue`, `/react`, and `/svelte` render it too. Every entry exports `isColor(value)`, the test the plugin runs on inline code.
