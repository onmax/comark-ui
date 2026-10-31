# comark-sources

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-sources&icon=npm)](https://npmx.dev/package/comark-sources)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-sources&period=month&icon=npm)](https://npmx.dev/package/comark-sources)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-sources)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/sources/)

Numbered `:cite[2]` citations that link to a `::sources` list of links, each with a link back. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-sources
```

```ts
import { createHtmlRenderer } from "@comark/html";
import sources, { components } from "comark-sources/html";

const render = createHtmlRenderer({ plugins: [sources()], components });
```

```md
Pigeons home by the sun :cite[1], and some by smell too :cite[2,3].

::sources
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
2. [Pigeon intelligence](https://en.wikipedia.org/wiki/Pigeon_intelligence)
3. [How do homing pigeons navigate?](https://www.sciencefocus.com/nature/how-do-homing-pigeons-navigate)
::
```

Each citation becomes a superscript link to its source, and each source gets a ↩ link back to every citation of it. Resting the pointer on a citation, or focusing it, shows a card with the source's title, its site, and the icon the list shows for it, such as a [comark-chips](https://npmx.dev/package/comark-chips) favicon. Citations are plain `sup` links that work in any renderer. The `::sources` component draws the list and the card.

The plugin adds every problem to `meta.issues`: a citation with no number or of a source the list doesn't have, citations with no list, a second list, a source without a link, and content beside the list. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-sources/html`: the styles and the card's script are inlined |
| `@comark/vue` | `comark-sources/vue` |
| `@comark/react` | `comark-sources/react` |
| `@comark/svelte` | `comark-sources/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles and start the card when they mount; import `comark-sources/style.css` with your styles so a server-rendered page doesn't shift.

For manual integration, `comark-sources/client` exports `css` and `start(css)`, which returns a function to stop the card. `addStyles()` adds only the styles.

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins.
