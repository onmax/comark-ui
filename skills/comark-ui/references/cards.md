# Cards and columns

comark-cards draws cards, link cards, and card groups, and lays blocks out in columns, in Nuxt UI's syntax. Use link cards to send readers to the next pages, and columns to set two short texts side by side, such as a before and an after.

## Syntax

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

| Prop | What it does |
| --- | --- |
| `title` | The card's title. A `#title` slot wins over it and can hold Markdown; then write the body after `#default`. |
| `description` | The text shown when the card has no content of its own. |
| `icon` | An icon above the title, in the card's color, named as in [icon](icon.md), such as `lucide:rocket`. The plugin reports one it can't draw. |
| `to` | Makes it a link card. One link covers the card and takes the title as its name, and links in the card's text still open on their own. A web address opens in a new tab with an arrow in the corner. |
| `target` | Where the link opens, such as `_self` to keep a web address in the tab. |
| `color` | Tints the icon and a hovered link card's border: `primary` (default), `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. |

`::card-group` sets its cards in two columns, or one when the group is narrower than 36rem, so a group in a sidebar stacks too. A card works on its own as well.

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

Each block directly inside `::columns` is one cell, and `:::column` groups several blocks into one cell. `cols` is 1 to 6, default 2. Every row stacks into one column when the block is narrower than 36rem.

## Write link cards

- Give every link card a `title`, since it names the link for screen readers. Without one, they hear "Card link".
- Link with `to`. A card with `href` still links, but Nuxt UI ignores `href`, so the plugin reports it. A `javascript:`, `vbscript:`, or `data:` link doesn't link, and the plugin reports it too.
- For screenshots side by side, use `::compare` from [annotate](annotate.md) instead of columns.

## Register

- In `comark-ui`: on, under the key `cards`, which takes only `true` or `false`. Its icons come from the preset's shared resolver, so `icon: { collections }` applies to them.
- Alone: `pnpm add comark @comark/html comark-cards`, then `createHtmlRenderer({ plugins: [cards()], components })` with both from `comark-cards/html`. By default icons come from the Iconify API while parsing. To share one resolver with the page's other plugins, add `comark-icon`, make one with `createIcons()`, and pass it as `cards({ iconResolver })`. The output needs no script. `comark-cards/vue`, `/react`, and `/svelte` render it too.
