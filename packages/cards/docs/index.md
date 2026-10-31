---
title: Cards
description: Cards, link cards, and columns, written in Markdown.
keywords: card grid, grid, layout, tiles, see also, next steps
tagline: A card that points readers to another page, and columns that set blocks side by side.
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

## Features

- A link card is one link that covers the card, named after its title, so a click anywhere opens it.
- A screen reader hears one link, not a card's worth of text, and links in the card's own text still work.
- Links to other sites open in a new tab, with an arrow in the corner.
- Groups and columns stack into one column when they're narrower than 36rem, whatever the screen's width.
- Nuxt UI's syntax, with no script.

## Usage

Write a `::card` with its text inside.

::example
```md
::card{title="Guides"}
Start here.
::
```
::

### Card

#### Title

Use the `title` prop to set the card's title. A `#title` slot wins over it, and can hold Markdown.

::example
```md
::card
#title
The `api` route

#default
Every option it takes.
::
```
::

#### Description

Use the `description` prop to set the card's text when it has no content of its own.

::example
```md
::card{title="Guides" description="Start here."}
::
```
::

#### Icon

Use the `icon` prop to show an icon above the title, in the card's color. [comark-icon](/icon/) resolves it while parsing.

::example
```md
::card{title="Renderers" icon="lucide:rocket"}
Render with HTML, Vue, React, or Svelte.
::
```
::

#### Link

Use the `to` prop to make the card a link card. A web address opens in a new tab, with an arrow in the corner.

::example
```md
::card{title="Renderers" icon="lucide:rocket" to="/guide/renderers/"}
Render with HTML, Vue, React, or Svelte.
::
```
::

> [!NOTE]
> Nuxt UI links a card with `to` and ignores `href`. A card with `href` still links here, but it adds an issue.

#### Target

Use the `target` prop to set where the link opens, such as `_self` to keep a web address in the tab.

```md
::card{title="Source on GitHub" to="https://github.com/onmax/comark-ui" target="_self"}
Read the code, or open an issue.
::
```

#### Color

Use the `color` prop to tint the icon and a hovered link card's border.

::example
```md
::card{title="Deprecated" icon="lucide:triangle-alert" color="warning"}
`useAsyncData` goes away in the next major.
::
```
::

#### Variant

Use the `variant` prop to change the card's look: `outline` keeps the plain card, `soft` washes it in its color, and `subtle` adds a border in the color.

::example
```md
::card-group
:::card{title="Soft" color="success" variant="soft" icon="lucide:circle-check"}
A light wash of the color.
:::

:::card{title="Subtle" color="success" variant="subtle" icon="lucide:circle-check"}
A wash with a colored border.
:::
::
```
::

### Card group

Use `::card-group` to set cards in two columns. A group narrower than 36rem shows one, so a group in a sidebar or a narrow column stacks too. A card works on its own as well.

::example
```md
::card-group
:::card{title="Renderers" to="/guide/renderers/"}
Render with HTML, Vue, React, or Svelte.
:::

:::card{title="Theming" to="/guide/theming/"}
Match the page's colors.
:::
::
```
::

### Columns

Use `::columns` to set blocks side by side. Each block directly inside is a cell, and `:::column` groups several blocks into one.

::example
```md
::columns
First cell.

:::column
Second cell, with

two paragraphs.
:::
::
```
::

#### Cols

Use the `cols` prop to set how many columns there are, from 1 to 6. Every row stacks into one column when the block is narrower than 36rem.

::example
```md
::columns{cols="3"}
First cell.

Second cell.

Third cell.
::
```
::

## Examples

### Link cards

A card with `to` renders the way Nuxt UI renders it. An empty link, named by the card's title, stretches over the card, and the card's content follows it. A screen reader reads the card as one link, and its text stays selectable. Links inside it sit on top of the stretched one, so they open on their own.

Links to other sites open in a new tab with `rel="noopener noreferrer"`. Set `target="_self"` to keep them in the tab.

## API

### Props

#### `::card`

| Prop | Default | Description |
| --- | --- | --- |
| `title` | — | The card's title. A `#title` slot wins over it, and can hold Markdown. |
| `description` | — | The text shown when the card has no content of its own. |
| `icon` | — | An icon above the title, in the card's color, such as `lucide:rocket`. |
| `to` | — | A page or a web address, which makes it a link card. A `javascript:`, `vbscript:`, or `data:` link doesn't link, and adds an issue. |
| `target` | `_blank` for a web address | Where the link opens. `_blank` opens a new tab, with an arrow in the corner. |
| `color` | `primary` | Tints the icon and a hovered link card's border: `primary`, `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. |
| `variant` | `outline` | The card's look: `outline`, `soft` (a light wash of its color), or `subtle` (a wash with a colored border). An unknown value falls back to `outline` and adds an issue. |

#### `::columns`

| Prop | Default | Description |
| --- | --- | --- |
| `cols` | `2` | How many columns, from 1 to 6. A value outside that shows 2 and adds an issue. |

`::card-group` and `:::column` take no props.

### Options

`cards()` takes one option, `iconResolver`, when you use it alone. In `comarkUi()`, `cards` takes no options, since cards share the resolver built from the `icon` options, and `cards: false` turns them off.

| Option | Default | Description |
| --- | --- | --- |
| `iconResolver` | Icons from the Iconify API | Resolves a card's `icon`, from `createIcons()` in [comark-icon](/icon/). |

Pass the page's resolver so every plugin shares it:

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

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- `href` instead of `to`. The card still links, but Nuxt UI ignores `href`, so the issue says to write `to`.
- A `to` that runs a script, such as `javascript:`, which doesn't link.
- A `color` it doesn't know, which shows as primary.
- A `variant` it doesn't know, which shows as outline.
- A `cols` outside 1 to 6, an empty `::columns`, and an icon comark-icon can't draw.
- A prop `::card` or `::columns` doesn't read, such as `link` or `columns`, which is ignored.

Each issue names its block, by its title when it has one, and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

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

Cards follow the shared tokens in [Theming](/guide/theming/), and a variable per color. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

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

### Variables

Each color but neutral reads Nuxt UI's variable first, then its own default. Set one on `.ccr` to change it:

| Variable | Default |
| --- | --- |
| `--ccr-primary` | `--ui-primary`, else shadcn/ui's `--primary`, else `--comark-foreground` |
| `--ccr-secondary` | `--ui-secondary`, else `--comark-info` |
| `--ccr-success` | `--comark-success` |
| `--ccr-info` | `--comark-info` |
| `--ccr-warning` | `--comark-warning` |
| `--ccr-error` | `--comark-danger` |
| `--ccr-neutral` | `--comark-foreground` |

Primary's default matches the page's brand color, or stays neutral without one.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.ccr` | A card, with `data-color`, and `data-variant` when it isn't `outline` |
| `.ccr-title` | The card's title |
| `.ccr-link` | The link that covers a link card |
| `.ccr-external` | The arrow on a card that opens in a new tab |
| `.ccr-group` | A card group |
| `.ccr-columns`, `.ccr-column` | Columns, with `data-cols`, and each cell |
