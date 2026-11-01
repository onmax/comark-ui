---
title: Outline
description: A table of contents in the body of a page, written in Markdown.
keywords: TOC, table of contents, contents, headings list, navigation, scrollspy, sidebar
tagline: A table of contents in the page, as a nested list of links to its headings that stays in step with them on every render.
group: Page behavior
icon: list-tree
blurb: A table of contents in the page
---

::examples
:::example{label="Contents"}
```md
::toc
::

## Feeding schedule

## Homing routes

### Short flights

### Long flights

## Known pigeons
```
:::

:::example{label="Deeper"}
```md
::toc{depth=4 title="On this page"}
::

## Setup

### Rings

#### Ring sizes

## Races
```
:::
::

## Features

- `::toc` becomes a nested list of links to the page's headings, rebuilt on every render.
- It links to the ids Comark gives the headings, and works in any plugin order.
- Each heading nests under the closest higher-level heading above it, so a page that skips a level still nests.
- The list is a `nav` that screen readers can jump to.
- The links work with no script, in any renderer that keeps the heading ids.
- With the `rail` option, an "On this page" column beside the text marks the section being read, and makes way for wide blocks.

## Usage

Put `::toc` where the list should go. It lists the page's h2 and h3 headings.

::example
```md
::toc
::

## Feeding schedule

### Mornings

## Homing routes
```
::

The list starts at h2, since a page's h1 is usually its title. A link uses the heading's own id when it has one, such as `## Events {#on}`. A page can have several `::toc`, and each lists the whole page.

### Depth

Use the `depth` prop to set the deepest heading the list shows, from 2 to 6.

::example
```md
::toc{depth=4}
::

## Setup

### Rings

#### Ring sizes

## Races
```
::

> [!NOTE]
> `depth` takes a whole number from 2 to 6. Any other value adds an issue, and the block renders nothing.

### Title

Use the `title` prop to put a small title above the list, which also names the `nav` for screen readers. Without it, the `nav` is named "Contents".

::example
```md
::toc{title="On this page"}
::

## Feeding schedule

### Mornings

#### Seed mix

## Homing routes
```
::

## Side outline

Use the `rail` option to put an "On this page" outline beside the text, like a docs site's. It lists the h2 and h3 headings of every document that has at least two, and marks the one being read.

```ts
import { createHtmlRenderer } from "@comark/html";
import comarkUi from "comark-ui/html";

const render = createHtmlRenderer(comarkUi({ outline: { rail: true } }));
```

The plugin adds the outline at the end of the document, as a `nav` that looks like the list. A small script places it 4rem right of the element you render into, or 2.5rem when room is short, at up to 15rem wide and 3.5rem below the top of the window. Under a fixed header, set `top` on `.cto-rail`. The script places it again when the window or that element resizes.

The outline shows only where it fits, so phones and narrow windows don't get it, and it never prints. A click scrolls to the heading, smoothly unless the reader asks for reduced motion.

| Option | Default | Description |
| --- | --- | --- |
| `title` | `"On this page"` | The title above the links, which also names the `nav` for screen readers. |
| `depth` | `3` | The deepest heading it lists, from 2 to 6. |

`rail: true` takes the defaults. Pass an object to change them, such as `outline: { rail: { title: "Sections", depth: 2 } }`.

> [!NOTE]
> The outline is fixed to the window. A `transform`, `filter`, or `contain` on any element around the document pins it to that element instead. Without the script, it stays hidden.

### Page variables

The page tells the outline what it covers, and the outline tells the page when it needs a column of its own:

| Variable | Set by | Description |
| --- | --- | --- |
| `--comark-inset-end` | The page, on `:root` | The width the page covers at the right edge, such as a side panel, in `px` or `rem`. The outline keeps clear of it, or hides, and moves when it changes. |
| `data-comark-rail` | The outline, on `<html>` | Set while the outline keeps a column beside [wide blocks](/guide/typeset/#wide-blocks). Shrink `--comark-wide-end` by `--comark-rail-width` while it's there. |
| `--comark-rail-width` | The outline, on `<html>` | The column it keeps with its gap, `264px`, while `data-comark-rail` is set. |

### Beside wide blocks

A wide block, such as a long Mermaid diagram, can grow into the room right of the text, where the outline goes. When the outline doesn't fit beside it, the outline keeps a 200px column 4rem right of the widest wide block and sets `data-comark-rail`. To keep wide blocks out of that column, take it off the room after the text. They then grow toward the room before the text, and the text stays put:

```css
main {
  width: min(100% - 3rem, 46rem);
  margin-inline: auto;
  --comark-wide-start: calc((100vw - 100%) / 2 - 1.5rem);
  --comark-wide-end: calc((100vw - 100%) / 2 - 1.5rem);
}

:root[data-comark-rail] main {
  --comark-wide-end: calc((100vw - 100%) / 2 - 1.5rem - var(--comark-rail-width));
}
```

When keeping the column would narrow a diagram, the outline hides instead, since the labels matter more. A before/after comparison fills whatever room it gets, so it makes room for the outline.

## Examples

### Long review documents

A review longer than a screen or two reads faster with an outline at the top, so each reviewer can jump to their part. Put `::toc` after the summary paragraph, and keep the headings short, since they become the links.

### A sidebar of your own

To draw an outline in your own layout instead of the [side outline](#side-outline), use Comark's toc plugin, which writes the headings to `meta.toc`. The two don't interfere.

### Coming from markdown-it-toc

Comark reads markdown-it-toc's `[[toc]]` as a span. Write `::toc` with `::` on the next line instead.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `depth` | `3` | The deepest heading it lists, from 2 to 6. The default lists h2 and h3 headings. |
| `title` | — | A small title above the list, which also names the `nav` for screen readers. Without it the `nav` is named "Contents". |

### Options

| Option | Default | Description |
| --- | --- | --- |
| `rail` | `false` | Adds the [side outline](#side-outline). `true` or `{ title, depth }`. |

In `comarkUi()`, pass them as `outline`, such as `outline: { rail: true }`. `outline: false` turns the plugin off.

### Functions

| Function | Description |
| --- | --- |
| `start()` | From `comark-outline/client`. Places the side outline and returns a function that stops it. The Vue, React, and Svelte components call it when they mount. |
| `railScript` | From `comark-outline/html`. The side outline's script exactly as the HTML renderer inlines it, so a page with a strict Content-Security-Policy can hash it. |

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A `depth` outside 2 to 6. The block renders nothing.
- A prop it doesn't read.
- Content inside the block, which is dropped.
- A page with no headings to list. The block renders nothing.

Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/).

### Package

comark-ui brings `comark-outline` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-outline
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import toc, { components } from "comark-outline/html";

const render = createHtmlRenderer({ plugins: [toc()], components });
```

Pass the options to the plugin, such as `toc({ rail: true })` for the [side outline](#side-outline).

For Vue, React, or Svelte, import from `comark-outline/vue`, `comark-outline/react`, or `comark-outline/svelte`. The components add the styles when they mount. Import `comark-outline/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The list has no box, so it reads like the page's text. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

The list reads these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-foreground` | The title and the first-level links |
| `--comark-muted` | The nested links |
| `--comark-border` | The line beside the nested links |
| `--comark-ring` | Focus rings |
| `--comark-font` | The text |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cto` | The `nav` |
| `.cto-title` | Its title |
| `.cto-rail` | The side outline's `nav`, beside `.cto`. Skip it in tools that read the page's text. |
| `.cto-rail[data-fits]` | The side outline once the script finds it room |
| `.cto-rail a[aria-current]` | The link to the section being read |
