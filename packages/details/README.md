# comark-details

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-details&icon=npm)](https://npmx.dev/package/comark-details)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-details&period=month&icon=npm)](https://npmx.dev/package/comark-details)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-details)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/details/)

Details, accordions, and collapsibles in Nuxt UI's syntax, drawn as native `<details>` with a real `<summary>`, so they open and close with no script. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-details
```

```ts
import { createHtmlRenderer } from "@comark/html";
import details, { components } from "comark-details/html";

const render = createHtmlRenderer({ plugins: [details()], components });
```

```md
::details{summary="Why?"}
Because.
::

::accordion{type="single" :defaultValue='["0"]'}
:::accordion-item{label="Is it free?" icon="lucide:badge-dollar-sign"}
Yes.
:::
::

::collapsible{name="options"}
Anything.
::
```

`::details` takes its summary from `summary` or a `#summary` slot, which Comark alone writes as a `<template>` browsers never show. `type="single"` gives an accordion's items one `name`, so opening one closes the others, and Nuxt UI's `defaultValue` opens items by position. `::collapsible` reads "Show options" and "Hide options". Icons resolve through comark-icon; pass `iconResolver` to share the page's.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a details block with no summary, content outside every accordion item, an item without a `label`, a `defaultValue` that isn't an item, and an icon it can't draw. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-details/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-details/vue` |
| `@comark/react` | `comark-details/react` |
| `@comark/svelte` | `comark-details/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-details/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--accent` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the spacing that draws each box: the padding of `.cdt` and its summary, the margins between accordion items, and the edge margins of a box's content are `!important`, because a page's own `details`, `summary`, and paragraph rules are almost always unlayered and would pull the summary out of line or split an accordion. Override those with `!important` too.
