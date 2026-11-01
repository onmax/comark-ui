---
title: Details
description: Details, accordions, and collapsibles, written in Markdown.
keywords: accordion, collapsible, collapse, expand, fold, spoiler, toggle, summary, disclosure, FAQ
tagline: A summary that opens to show more, as one disclosure, an accordion of them, or a quiet collapsible.
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

## Features

- Every block renders as `<details>` with a real `<summary>`, even from a `#summary` slot, so it opens and closes with no script.
- The browser's search finds text inside a closed block, and it prints.
- A single accordion keeps one item open through the `name` attribute, which [every current browser](https://caniuse.com/mdn-html_elements_details_name) supports.
- It uses Nuxt UI's syntax, so a page renders the same under Nuxt UI.

## Usage

Write `::details` with a `summary` and the content it hides.

::example
```md
::details{summary="Why?"}
Because.
::
```
::

### Details

#### Summary

Use the `summary` prop to set the text that shows while it's closed. A `#summary` slot wins over it, and can hold Markdown.

::example
```md
::details
#summary
Why **pnpm**?

#default
It saves disk.
::
```
::

> [!NOTE]
> A `::details` with no summary shows "Details" and adds an issue.

#### Open

Use the `open` prop to start it open.

::example
```md
::details{summary="Why?" open}
Because.
::
```
::

#### Icon

Use the `icon` prop to show an icon before the summary.

::example
```md
::details{summary="Why does the build need Node 22?" icon="lucide:info"}
`node:sqlite` caches the icons between builds.
::
```
::

### Accordion

Use `::accordion` with one `:::accordion-item` for each item.

::example
```md
::accordion
:::accordion-item{label="Is it free?"}
Yes.
:::

:::accordion-item{label="Where's the source?"}
On GitHub.
:::
::
```
::

#### Type

Use the `type` prop to keep one item open at a time. `multiple`, the default, lets every item open at once. `single` gives the items one `name`, so opening one closes the others.

::example
```md
::accordion{type="single"}
:::accordion-item{label="Is it free?"}
Yes.
:::

:::accordion-item{label="Does it need a script?"}
No.
:::
::
```
::

#### Default value

Use the `defaultValue` prop to open items on load. It takes positions from 0, as in Nuxt UI: `:defaultValue='["0", "2"]'`, or `defaultValue="1"` for one.

::example
```md
::accordion{:defaultValue='["1"]'}
:::accordion-item{label="Is it free?"}
Yes.
:::

:::accordion-item{label="Does it need a script?"}
No.
:::
::
```
::

> [!NOTE]
> A `single` accordion opens only the first of them.

### Accordion item

#### Label

Use the required `label` prop to set the item's summary. An item without one shows "Item 1", "Item 2", and so on, and adds an issue.

```md
:::accordion-item{label="Is it free?"}
Yes.
:::
```

#### Icon

Use the `icon` prop to show an icon before the label.

::example
```md
::accordion
:::accordion-item{label="Is it free?" icon="lucide:badge-dollar-sign"}
Yes. Every package is MIT licensed.
:::
::
```
::

#### Description

Use the `description` prop to set the item's text when it has no content of its own.

::example
```md
::accordion
:::accordion-item{label="Where's the source?" description="On GitHub."}
:::
::
```
::

### Collapsible

Use `::collapsible` to hide content behind a quiet line of text.

::example
```md
::collapsible
- `level`: the heading level that starts each step.
- `start`: the number of the first step.
::
```
::

#### Name

Use the `name` prop to say what the collapsible hides. It defaults to "properties". With `name="options"`, the summary reads "Show options" when closed and "Hide options" when open.

::example
```md
::collapsible{name="options"}
Anything.
::
```
::

> [!NOTE]
> The words before the name come from the styles. Without them, the summary reads "options" alone.

#### Open and close text

Use the `openText` and `closeText` props to change the words before the name. They default to "Show" and "Hide".

::example
```md
::collapsible{name="options" openText="See" closeText="Fold"}
Anything.
::
```
::

#### Icon

Use the `icon` prop to show an icon before the summary.

```md
::collapsible{name="options" icon="lucide:settings"}
Anything.
::
```

## Examples

### Accordions on one page

Two `type="single"` accordions on one page never close each other's items, even when they come from different documents.

## Accessibility

Each block is a native `<details>`, so the browser handles focus, keys, and what a screen reader hears. Every summary is a tab stop.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Enter`, `Space` | Opens or closes the focused summary. |
| `Tab`, `Shift+Tab` | Moves focus to the next or previous summary. |

## API

### Props

#### `::details`

| Prop | Default | Description |
| --- | --- | --- |
| `summary` | `"Details"` | The text that shows while it's closed. A `#summary` slot wins over it. |
| `open` | `false` | Starts it open. |
| `icon` | — | An icon before the summary. |

#### `::accordion`

| Prop | Default | Description |
| --- | --- | --- |
| `type` | `multiple` | `multiple` lets every item open at once. `single` gives the items one `name`, so opening one closes the others. |
| `defaultValue` | — | The items that start open, by position from 0: `:defaultValue='["0", "2"]'`, or `defaultValue="1"` for one. A single accordion opens only the first. |

#### `:::accordion-item`

| Prop | Default | Description |
| --- | --- | --- |
| `label` | `"Item 1"`, `"Item 2"`, … | The summary. Required, so leaving it out adds an issue. |
| `icon` | — | An icon before the label. |
| `description` | — | The text shown when the item has no content of its own. |

#### `::collapsible`

| Prop | Default | Description |
| --- | --- | --- |
| `name` | `"properties"` | What it hides, after the open or close text. |
| `openText` | `"Show"` | The word before the name while it's closed. |
| `closeText` | `"Hide"` | The word before the name while it's open. |
| `icon` | — | An icon before the summary. |

### Slots

| Slot | Description |
| --- | --- |
| `#summary` | The summary of a `::details`, which can hold Markdown. It wins over `summary`. |
| `#default` | The content it hides. |

### Options

The plugin's one option goes under `details` in `comarkUi()`, or to `details()` when you use it alone.

| Option | Default | Description |
| --- | --- | --- |
| `iconResolver` | Icons from the Iconify API | Resolves each block's `icon`, from `createIcons()` in [comark-icon](/icon/). In `comarkUi()` it defaults to the resolver built from the `icon` options. |

Pass the page's resolver so every plugin shares it:

```ts
import { createIcons } from "comark-icon";
import details from "comark-details/html";

const plugins = [details({ iconResolver: createIcons() })];
```

### Your own renderer

Every block becomes a `disclosure` node, drawn as `<details>`. Its first child is a `disclosure-summary`, drawn as `<summary>`, which holds the label. An accordion becomes an `accordion` node of disclosures:

```json
["accordion", {},
  ["disclosure", { "variant": "item", "name": "cdt-1x2y3z-1", "open": "true" },
    ["disclosure-summary", { "icon": { "src": "data:image/svg+xml,…" } }, "Is it free?"],
    "Yes."]]
```

`variant` is `details`, `item`, or `collapsible`. A collapsible's summary also has `show` and `hide`, the words before its label.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A `::details` with no summary shows "Details".
- Content in an `::accordion` outside every `:::accordion-item`, which doesn't render, and an accordion with no items.
- An item without a `label`, a `defaultValue` that isn't an item's position, and a `type` that isn't `single` or `multiple`.
- An `:::accordion-item` outside `::accordion` renders on its own.
- An empty `::collapsible`, and an icon comark-icon can't draw.
- A prop the block doesn't read, such as a misspelled `summary`.

Each issue names its block, says how to fix it, and has its own rule in [Doctor](/doctor/).

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

For Vue, React, or Svelte, import from `comark-details/vue`, `comark-details/react`, or `comark-details/svelte`. The components add the styles when they mount. On a server, import `comark-details/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Details and accordions are bordered boxes with a chevron that turns as they open. A collapsible is a quiet line of text. All three use the shared tokens in [Theming](/guide/theming/).

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The boxes |
| `--comark-foreground` | Summaries |
| `--comark-muted` | Chevrons, icons, a collapsible's summary |
| `--comark-border` | Boxes, the lines between accordion items |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners |
| `--comark-font` | Summaries |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cdt` | A `<details>`, with `data-variant` (`details`, `item`, or `collapsible`) |
| `.cdt-summary` | Its `<summary>` |
| `.cdt-toggle` | A collapsible's open or close text, from `data-show` and `data-hide` |
| `.cdt-accordion` | The `<div>` around an accordion's items |

### Important rules

The rules sit in a `comark` CSS layer, so any plain rule of yours wins, except the spacing that draws each box. The padding of `.cdt` and its summary, the margins between accordion items, and the edge margins of a box's content are `!important`, so override them with `!important` too.
