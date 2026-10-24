# comark-colors

[![npm version](https://npmx.dev/api/registry/badge/version/comark-colors)](https://npmx.dev/package/comark-colors)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-colors)](https://npmx.dev/package/comark-colors)
[![install size](https://npmx.dev/api/registry/badge/size/comark-colors)](https://npmx.dev/package/comark-colors)
[![license](https://npmx.dev/api/registry/badge/license/comark-colors)](https://npmx.dev/package/comark-colors)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/colors/)

A swatch before inline code that holds a color, as GitLab draws it, and `::palette` grids of named colors. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-colors
```

```ts
import { createHtmlRenderer } from "@comark/html";
import colors, { components } from "comark-colors/html";

const render = createHtmlRenderer({ plugins: [colors()], components });
```

```md
The button moves from `#3b82f6` to `oklch(0.55 0.2 264)`.

::palette
- Primary: `#3b82f6`
- Danger: #dc2626
::
```

Inline code that holds one literal hex, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, or `oklch()` color gets a swatch, with no new syntax. Calculated components such as `calc()` are left as code. A `::palette` holds one list of `name: color` lines and draws a tile for each.

The plugin adds every problem with a palette to `meta.issues`: no list, content beside it, a line with no name or color, and a color it can't draw. Each issue names its palette and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-colors/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-colors/vue` |
| `@comark/react` | `comark-colors/react` |
| `@comark/svelte` | `comark-colors/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-colors/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins.
