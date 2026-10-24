---
title: Outline
description: A table of contents in the body of a page, written in Markdown.
keywords: TOC, table of contents, contents, headings list, navigation
tagline: Put a contents block where the list should go and get a nested list of links to the page's headings, kept in step with them on every render.
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

The plugin reads the page's headings itself, with the ids Comark gives them, so a `::toc` works in any order with other plugins and doesn't need Comark's toc plugin, which only fills `meta.toc` for a sidebar.

## Usage

`::toc` takes its props in braces after its name. This one lists the headings down to h3 under a title, so "Seed mix", an h4, stays out:

::example
```md
::toc{depth=3 title="On this page"}
::

## Feeding schedule

### Mornings

#### Seed mix

## Homing routes
```
::

| Prop | What it does |
| --- | --- |
| `depth` | The deepest heading it lists, from 2 to 6. Default 3, so h2 and h3 headings. |
| `title` | A small title above the list, which also names the `nav` for screen readers. Without it the `nav` is named "Contents". |

The list starts at h2, since a page's h1 is usually its title. Each heading sits under the closest heading above it of a higher level, so a page that skips a level still nests sensibly. A heading's own id, such as `## Events {#on}`, is the one the link uses. A page can hold more than one `::toc`, and each lists the whole page.

`[[toc]]`, as markdown-it-toc writes it, isn't read: in Comark `[[...]]` is a span, and the block syntax is the one every other plugin uses.

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a `depth` outside 2 to 6, a prop it doesn't read, content inside the block (it's dropped), and a page with no headings to list (it renders nothing). Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/).

## Examples

### Long review documents

A review document that grows past a screen or two reads faster with its outline at the top: the reviewer sees what's covered and jumps to the part they own. Put `::toc` after the summary paragraph, and keep the headings short, since they become the links.

### A sidebar instead

For a contents list beside the page rather than in it, use Comark's own toc plugin, which writes the headings to `meta.toc` for your layout to draw. The two don't interfere.

## API

The plugin takes no options. In `comarkUi()`, `outline: false` turns it off.

The links point at the heading ids Comark writes, so they work with any renderer that keeps them.

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

For Vue, React, or Svelte, import from `comark-outline/vue`, `comark-outline/react`, or `comark-outline/svelte`; the components add the styles when they mount. Import `comark-outline/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The list has no box, so it sits in the page like its text. It reads the [shared tokens](/guide/theming/): `--comark-foreground` for its title and first-level links, `--comark-muted` for the nested ones, `--comark-border` for the line beside them, `--comark-ring` for focus rings, and `--comark-font` for its text. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

| Class | Element |
| --- | --- |
| `.cto` | The `nav` |
| `.cto-title` | Its title |
