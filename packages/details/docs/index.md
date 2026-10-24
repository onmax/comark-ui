---
title: Details
description: Details, accordions, and collapsibles, written in Markdown.
keywords: accordion, collapsible, collapse, expand, fold, spoiler, toggle, summary, disclosure, FAQ
tagline: Fold away the answer, the long log, or the optional props behind a summary that opens with no script. Nuxt UI's syntax, drawn as native details.
group: Docs blocks
icon: list-collapse
blurb: Details and accordions
credits: 'Syntax from <a href="https://ui.nuxt.com/docs/typography">Nuxt UI</a>''s prose accordion and collapsible.'
---

::examples
:::example{label="Details"}
```md
::details{summary="Why does the build need Node 22?"}
`node:sqlite` caches the icons between builds, and it shipped in Node 22.5.
::
```
:::

:::example{label="Accordion"}
```md
::accordion{type="single" :defaultValue='["0"]'}
:::accordion-item{label="Is it free?" icon="lucide:badge-dollar-sign"}
Yes. Every package is MIT licensed.
:::

:::accordion-item{label="Does it need a script?" icon="lucide:code"}
No. Each item is a native `<details>`, and `type="single"` gives them one `name`, so opening one closes the others.
:::
::
```
:::

:::example{label="Collapsible"}
```md
::collapsible{name="options"}
- `level`: the heading level that starts each step.
- `start`: the number of the first step.
::
```
:::
::

Everything renders as `<details>` with a real `<summary>`, so it opens and closes, finds with the browser's search, and prints, all without a script. Comark alone writes a `#summary` slot as a `<template>`, which browsers never show.

## Usage

### Details

```md
::details{summary="Why?" open}
Because.
::
```

Or give the summary in a slot, where it can hold Markdown:

```md
::details
#summary
Why **pnpm**?

#default
It saves disk.
::
```

| Prop | What it does |
| --- | --- |
| `summary` | The text that shows while it's closed. A `#summary` slot wins over it. |
| `open` | Starts it open. |
| `icon` | An icon before the summary. |

### Accordion

```md
::accordion{type="single" :defaultValue='["0"]'}
:::accordion-item{label="Is it free?" icon="lucide:badge-dollar-sign"}
Yes.
:::

:::accordion-item{label="Where's the source?" description="On GitHub."}
:::
::
```

| Prop | What it does |
| --- | --- |
| `type` | `multiple`, the default, lets every item open at once. `single` gives the items one `name`, so opening one closes the others, which [every current browser](https://caniuse.com/mdn-html_elements_details_name) does. |
| `defaultValue` | The items that start open, by position from 0, as Nuxt UI takes them: `:defaultValue='["0", "2"]'`, or `defaultValue="1"` for one. A single accordion opens only the first. |

Each `:::accordion-item` takes `label`, the summary, `icon`, and `description`, the text shown when the item has no content of its own.

### Collapsible

```md
::collapsible{name="options" openText="Show" closeText="Hide"}
Anything.
::
```

The summary reads "Show options" while it's closed and "Hide options" while it's open. `name` defaults to "properties", and `icon` sets an icon before it. Without the styles, it reads "options" alone.

This is Nuxt UI's syntax, unchanged, so a page renders the same accordions and collapsibles under Nuxt UI.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A `::details` with no summary shows "Details".
- Content in an `::accordion` outside every `:::accordion-item` doesn't render, and an accordion with no items is reported.
- An item without a `label`, a `defaultValue` that isn't an item's position, and a `type` that isn't `single` or `multiple`.
- An `:::accordion-item` outside `::accordion` renders on its own.
- An empty `::collapsible`, and an icon comark-icon can't draw.
- A prop the block doesn't read, such as a misspelled `summary`.

Each issue names its block and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Accordions on one page

A `type="single"` accordion names its items from a hash of the document and the accordion's position, so two accordions on one page, or two documents rendered into one page, never close each other's items. The name stays the same every time a document renders, so server and client output match.

## API

The plugin's one option, `iconResolver`, goes under `details` in `comarkUi()`, or to `details()` when you use it alone. In `comarkUi()` it defaults to the resolver built from the `icon` options.

### Icons

Accordion items and collapsibles take an `icon`, resolved by [comark-icon](/icon/) while parsing. By default icons come from the Iconify API; pass the page's resolver so every plugin shares it:

```ts
import { createIcons } from "comark-icon";
import details from "comark-details/html";

const plugins = [details({ iconResolver: createIcons() })];
```

### Your own renderer

Every block becomes a `disclosure` node, drawn as `<details>`, whose first child is a `disclosure-summary`, drawn as `<summary>`, holding the label. An accordion becomes an `accordion` node of disclosures:

```json
["accordion", {},
  ["disclosure", { "variant": "item", "name": "cdt-1x2y3z-1", "open": "true" },
    ["disclosure-summary", { "icon": { "src": "data:image/svg+xml,…" } }, "Is it free?"],
    "Yes."]]
```

`variant` is `details`, `item`, or `collapsible`. A collapsible's summary also has `show` and `hide`, the words before its label.

### Package

comark-ui brings `comark-details` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-details
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import details, { components } from "comark-details/html";

const render = createHtmlRenderer({ plugins: [details()], components });
```

For Vue, React, or Svelte, import from `comark-details/vue`, `comark-details/react`, or `comark-details/svelte`; the components add the styles when they mount. Import `comark-details/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Details and accordions are bordered boxes with a chevron that turns as they open; a collapsible is a quiet line of text. Each is a `<details class="cdt">` with `data-variant`, and an accordion wraps its items in `<div class="cdt-accordion">`. They read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | The boxes |
| `--comark-foreground` | Summaries |
| `--comark-muted` | Chevrons, icons, a collapsible's summary |
| `--comark-border` | Boxes, the lines between accordion items |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners |
| `--comark-font` | Summaries |

The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the spacing that draws each box: the padding of `.cdt` and its summary, the margins between accordion items, and the edge margins of a box's content are `!important`, because a page's own `details`, `summary`, and paragraph rules are almost always unlayered and would pull the summary out of line or split an accordion. Override those with `!important` too.
