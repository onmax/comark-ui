# comark-zoom

[![npm version](https://npmx.dev/api/registry/badge/version/comark-zoom)](https://npmx.dev/package/comark-zoom)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-zoom)](https://npmx.dev/package/comark-zoom)
[![install size](https://npmx.dev/api/registry/badge/size/comark-zoom)](https://npmx.dev/package/comark-zoom)
[![license](https://npmx.dev/api/registry/badge/license/comark-zoom)](https://npmx.dev/package/comark-zoom)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/zoom/)

Zoom images and any block like medium-zoom, written in Markdown. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-zoom
```

```ts
import { createHtmlRenderer } from "@comark/html";
import zoom, { components } from "comark-zoom/html";

const render = createHtmlRenderer({ plugins: [zoom()], components });
```

Content images zoom on their own, except images inside links. Wrap any other block in `::zoom` to make it zoomable, and give blocks the same `group` to page through them in one zoomed view with a strip at the bottom:

```md
![Dashboard](dashboard.png)

::zoom{group="tour" title="Step one"}
Any Markdown: code, callouts, tables.
::
```

The zoomed view grows out of the item's place on the page. Escape, Back, and a click around it close it; arrow keys and the strip page through a group; Enter or Space opens a focused item. `zoom({ images: false })` leaves images alone, except those you mark with `{data-zoom}`, and `{zoom=false}` keeps one image from zooming. Add `data-zoom-src` to an image to load a larger file when it zooms; the page's image shows until it loads.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-zoom/html`: the script is inlined once per document |
| `@comark/vue` | `comark-zoom/vue` |
| `@comark/react` | `comark-zoom/react` |
| `@comark/svelte` | `comark-zoom/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. Without a renderer, call `start()` from `comark-zoom/client` once on a page with `data-zoom` elements; it returns a function that stops it.

## Customize

The zoomed view fires `comark-zoom:open`, `comark-zoom:change`, and `comark-zoom:close` on the item. `open` and `change` carry the dialog's `header`, `footer`, and a `layer` sized to the zoomed content, so a host can add its own controls or draw pins over it, plus `copyOf(element)` and `originalOf(element)` to go between the page and the zoomed copy.

An item that needs styles from its ancestors names them with `data-zoom-context`, a selector: the copy goes inside empty copies of every ancestor that matches. `data-zoom-aside`, another selector, puts a copy of that element beside the zoomed item at its own size, such as a caption; it's the first match that neither holds the item nor sits in it, in its innermost context or else its parent.

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set `--comark-background`, `--comark-foreground`, `--comark-muted`, `--comark-border`, `--comark-accent`, `--comark-ring`, `--comark-radius`, or `--comark-font` to theme zoom, carousel, and annotate at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins. See [Theming](https://comark-ui.onmax.me/guide/theming/) for the Nuxt UI mapping. To theme only the zoomed view, set the tokens on `.cz-dialog`, and change the backdrop with `--cz-backdrop` or `--cz-backdrop-opacity`; see the zoom's [Theming page](https://comark-ui.onmax.me/zoom/#theme).
