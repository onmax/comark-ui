# comark-carousel

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-carousel&icon=npm)](https://npmx.dev/package/comark-carousel)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-carousel&period=month&icon=npm)](https://npmx.dev/package/comark-carousel)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-carousel)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/carousel/)

A carousel of any Markdown content, written in Markdown. Slides scroll and snap without a script, with a scrollbar to reach the others; the script swaps it for arrows, a slide counter, and arrow keys that follow the reading direction, and zooms a slide with the others in a strip at the bottom. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-carousel
```

```ts
import { createHtmlRenderer } from "@comark/html";
import carousel, { components } from "comark-carousel/html";

const render = createHtmlRenderer({ plugins: [carousel()], components });
```

Every block inside `::carousel` is a slide. Use `:::slide` when a slide holds several blocks:

```md
::carousel{title="Tour"}
![Dashboard](dashboard.png)

![Settings](settings.png)

```ts
const anyContent = true
```
::

::carousel
:::slide{title="Step one"}
Text and an image in one slide.

![Step one](one.png)
:::

:::slide
Step two.
:::
::
```

`columns=2` or `columns=3` shows several slides at once on wide pages and one at a time on narrow ones. Slides zoom with [`comark-zoom`](../zoom), which comes with it, and paging in the zoomed view moves the carousel too; `zoom=false` turns that off. A zoomed slide with no title or image of its own takes the carousel's `title` as its heading. Props can be inline or bound, such as `:columns="2"`; bind `zoom` and `title` only to the document or its front matter.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: content outside every `:::slide` (it's dropped), a carousel with no slides, `columns` that isn't 1, 2, or 3, a `:::slide` outside a carousel (it renders as plain content), and a `:zoom` or `:title` that reads render-time data. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-carousel/html`: the scripts are inlined |
| `@comark/vue` | `comark-carousel/vue` |
| `@comark/react` | `comark-carousel/react` |
| `@comark/svelte` | `comark-carousel/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. 

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set `--comark-background`, `--comark-foreground`, `--comark-muted`, `--comark-border`, `--comark-accent`, `--comark-ring`, `--comark-radius`, or `--comark-font` to theme zoom, carousel, and annotate at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins. See [Theming](https://comark-ui.onmax.me/guide/theming/) for the Nuxt UI mapping. Set `--cc-gap`, `--cc-surface`, `--cc-padding`, and `--cc-button-size` for the space between slides, the panel behind each one, and the arrows; see the carousel's [Theming page](https://comark-ui.onmax.me/carousel/#theme).
