---
title: Outline
description: A table of contents in the body of a page, written in Markdown.
keywords: TOC, table of contents, contents, headings list, navigation
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

- `::toc` becomes a nested list of links to the page's headings, kept in step with them on every render.
- The plugin reads the headings itself, with the ids Comark gives them, so it works in any order with other plugins and doesn't need Comark's toc plugin.
- Each heading sits under the closest heading above it of a higher level, so a page that skips a level still nests sensibly.
- The list is a `nav` that screen readers can jump to.
- No script: the links work in any renderer that keeps the heading ids.

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

The list starts at h2, since a page's h1 is usually its title. A heading's own id, such as `## Events {#on}`, is the one the link uses. A page can hold more than one `::toc`, and each lists the whole page.

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
> `depth` takes a whole number from 2 to 6. Any other value is reported, and the block renders nothing.

### Title

Use the `title` prop to put a small title above the list. It also names the `nav` for screen readers. Without it the `nav` is named "Contents".

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

## Examples

### Long review documents

A review document that grows past a screen or two reads faster with its outline at the top: the reviewer sees what's covered and jumps to the part they own. Put `::toc` after the summary paragraph, and keep the headings short, since they become the links.

### A sidebar instead

For a contents list beside the page rather than in it, use Comark's own toc plugin, which writes the headings to `meta.toc` for your layout to draw. The two don't interfere.

### Coming from markdown-it-toc

`[[toc]]`, as markdown-it-toc writes it, isn't read: in Comark `[[...]]` is a span, and the block syntax is the one every other plugin uses. Write `::toc` and `::` on the next line instead.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `depth` | `3` | The deepest heading it lists, from 2 to 6. The default lists h2 and h3 headings. |
| `title` | — | A small title above the list, which also names the `nav` for screen readers. Without it the `nav` is named "Contents". |

### Options

The plugin takes no options. In `comarkUi()`, `outline: false` turns it off.

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

The links point at the heading ids Comark writes, so they work with any renderer that keeps them.

For Vue, React, or Svelte, import from `comark-outline/vue`, `comark-outline/react`, or `comark-outline/svelte`; the components add the styles when they mount. Import `comark-outline/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The list has no box, so it sits in the page like its text. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

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
