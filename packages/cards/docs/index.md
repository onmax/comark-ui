---
title: Cards
description: Cards, link cards, and columns, written in Markdown.
keywords: card grid, grid, layout, tiles, see also, next steps
tagline: Point readers to the next page with link cards, and set blocks side by side in columns. Nuxt UI's syntax, with no script.
group: Docs blocks
icon: layout-grid
blurb: Cards and columns
credits: 'Syntax from <a href="https://ui.nuxt.com/docs/typography">Nuxt UI</a>''s prose cards.'
---

::examples
:::example{label="Link cards"}
```md
::card-group
:::card{title="Renderers" icon="lucide:rocket" to="/guide/renderers/"}
Render with HTML, Vue, React, or Svelte.
:::

:::card{title="Source on GitHub" icon="lucide:github" to="https://github.com/onmax/comark-ui" color="neutral"}
Read the code, or open an issue.
:::
::
```
:::

:::example{label="Columns"}
```md
::columns{cols="2"}
:::column
**Before**

One long page of options.
:::

:::column
**After**

Each option under its own heading.
:::
::
```
:::
:::example{label="States"}
```md
::card-group
:::card{title="Failing" color="error" variant="soft" icon="lucide:circle-x"}
`upload.test.ts` times out on files over 10 MB.
:::

:::card{title="Passing" color="success" variant="soft" icon="lucide:circle-check"}
Every other test passes.
:::
::
```
:::
::

A link card is one link that covers the card, named after its title, so a click anywhere opens it and a screen reader hears one link, not a card's worth of text. Links in the card's own text still work.

## Usage

### Cards

```md
::card-group
:::card{title="Guides" description="Start here." icon="lucide:book-open" to="/guides/"}
:::

:::card
#title
The `api` route

#default
Every option it takes.
:::
::
```

| Prop | What it does |
| --- | --- |
| `title` | The card's title. A `#title` slot wins over it, and can hold Markdown. |
| `description` | The text shown when the card has no content of its own. |
| `icon` | An icon above the title, in the card's color. |
| `to` | Makes it a link card. A web address opens in a new tab with an arrow in the corner. |
| `target` | Where the link opens, such as `_self` to keep a web address in the tab. |
| `color` | Tints the icon and a hovered link card's border: `primary`, the default, `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. |
| `variant` | The card's appearance: `outline` (the default), `soft` (a light color wash), or `subtle` (a wash with a colored border). An unknown value falls back to `outline` and adds an issue. |

`::card-group` sets its cards in two columns, and in one when the group is narrower than 36rem, whatever the screen's width, so a group in a sidebar or a narrow column stacks too. A card works on its own too.

### Columns

```md
::columns{cols="3"}
First cell.

:::column
Second cell, with

two paragraphs.
:::

Third cell.
::
```

Each block directly inside is a cell, and `:::column` groups several blocks into one. `cols` is 1 to 6, 2 by default, and every row stacks into one column when the block is narrower than 36rem.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- `href` instead of `to`. The card still links, but Nuxt UI ignores `href`, so the issue says to write `to`.
- A `to` that runs a script, such as `javascript:`, which doesn't link.
- A `color` it doesn't know, which shows as primary.
- A `cols` outside 1 to 6, an empty `::columns`, and an icon comark-icon can't draw.
- A prop `::card` or `::columns` doesn't read, such as `link` or `columns`, which is ignored.

Each issue names its block, by its title when it has one, and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Link cards

A card with `to` renders the way Nuxt UI renders it. An empty link, named by the card's title, stretches over the card, and the card's content follows it. A screen reader reads the card as one link, and its text stays selectable. Links inside it sit on top of the stretched one, so they open on their own.

Links to other sites open in a new tab with `rel="noopener noreferrer"` and an arrow in the corner. Set `target="_self"` to keep them in the tab.

## API

`cards()` takes one option, `iconResolver`, when you use it alone. In `comarkUi()`, `cards` takes no options, since cards share the resolver built from the `icon` options, and `cards: false` turns them off.

### Icons

[comark-icon](/icon/) resolves a card's `icon` while parsing. By default icons come from the Iconify API. Pass the page's resolver so every plugin shares it:

```ts
import { createIcons } from "comark-icon";
import cards from "comark-cards/html";

const plugins = [cards({ iconResolver: createIcons() })];
```

### Your own renderer

The parse plugin replaces each card's attributes with the ones it renders from, puts its title in a `card-title` node, and wraps each cell of `::columns` in a `column` node:

```json
["card", { "color": "primary", "to": "/guide", "label": "Docs", "icon": { "src": "data:image/svg+xml,…" } },
  ["card-title", {}, "Docs"],
  "Read it."]
```

The plugin sets `external` when the link opens in a new tab. `label` is the link's name, which is the title's text or "Card link".

### Package

comark-ui brings `comark-cards` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-cards
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import cards, { components } from "comark-cards/html";

const render = createHtmlRenderer({ plugins: [cards()], components });
```

For Vue, React, or Svelte, import from `comark-cards/vue`, `comark-cards/react`, or `comark-cards/svelte`. The components add the styles when they mount. When you render on a server, import `comark-cards/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A card is a `<div class="ccr" data-color="...">`. A group is a `<div class="ccr-group">`, and columns are a `<div class="ccr-columns" data-cols="...">` of `<div class="ccr-column">`.

Each color reads Nuxt UI's variable, such as `--ui-primary`, then its own default. Primary falls back to shadcn/ui's `--primary`, then to the foreground, so cards match the page's brand color, or stay neutral without one. Set `--ccr-primary` and the others on `.ccr` to change one.

Cards also read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | Cards |
| `--comark-foreground` | Titles |
| `--comark-muted` | Text, the arrow on external cards |
| `--comark-border` | Cards |
| `--comark-accent` | A hovered link card |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners |
| `--comark-font` | Text |

The rules sit in a `comark` CSS layer, so any plain rule of your own wins.
