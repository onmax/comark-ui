# comark-cards

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-cards&icon=npm)](https://npmx.dev/package/comark-cards)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-cards&period=month&icon=npm)](https://npmx.dev/package/comark-cards)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-cards)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/cards/)

Cards, link cards, and columns in Nuxt UI's syntax, with no script. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-cards
```

```ts
import { createHtmlRenderer } from "@comark/html";
import cards, { components } from "comark-cards/html";

const render = createHtmlRenderer({ plugins: [cards()], components });
```

```md
::card-group
:::card{title="Guides" icon="lucide:book-open" to="/guides/"}
Start here.
:::

:::card{title="GitHub" to="https://github.com/onmax/comark-ui" color="neutral"}
Read the code.
:::
::

::columns{cols="2"}
Left.

Right.
::
```

`::card` takes `title` (or a `#title` slot), `description`, `icon`, `to`, `target`, `color`, and `variant`: `soft` washes the card in its color, and `subtle` draws its border in it too. A card with `to` is covered by one link named after its title; a web address opens in a new tab. `::columns{cols}` makes a cell of each block inside, and `:::column` groups several. Icons resolve through comark-icon; pass `iconResolver` to share the page's.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: `href` written instead of `to`, a script link, an unknown color or variant, a `cols` outside 1 to 6, and an icon it can't draw. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-cards/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-cards/vue` |
| `@comark/react` | `comark-cards/react` |
| `@comark/svelte` | `comark-cards/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-cards/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--accent` and `--border`, when the page has them, and use its neutral theme otherwise, while colors read Nuxt UI's `--ui-*` variables. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins.
