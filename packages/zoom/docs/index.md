---
title: Zoom
description: Zoom images and any block out of the page, like medium-zoom, written in Markdown.
keywords: lightbox, medium-zoom, image zoom, enlarge, fullscreen, gallery, popup, modal, magnify
tagline: A view that zooms an image or any block out of the page, and pages through a group of them.
group: Page behavior
icon: zoom-in
blurb: Zoom images and any block
credits: 'Modeled on <a href="https://github.com/francoischalifour/medium-zoom">medium-zoom</a>.'
---

::examples
:::example{label="Image"}
```md
![Office correlations dashboard](/dashboard.png)
```
:::

:::example{label="Any block"}
```md
::zoom{title="Deploy retry policy"}
| Attempt | Wait |
| --- | --- |
| 1 | 1 s |
| 2 | 4 s |
| 3 | Until the pigeons leave |
::
```
:::

:::example{label="Group"}
```md
::zoom{group="tour" title="Before"}
![Filter toolbar wrapping](/before.png)
::

::zoom{group="tour" title="After"}
![Filter toolbar on one row](/after.png)
::
```
:::
::

## Features

- Content images zoom with no markup.
- `::zoom` zooms any block: a table, a code block, a diagram.
- Items in one group page through a single view, with a strip of thumbnails.
- An image grows no larger than its natural size, so it stays sharp.
- Escape, Back, or a click around the item closes the view, and focus returns to the item.

## Usage

Content images zoom on their own. The zoomed view shows the image's `alt` text as its title.

```md
![Office correlations dashboard](/dashboard.png)
```

### Any block

Use `::zoom` to zoom any other block, or several blocks together.

::example
```md
::zoom
| Attempt | Wait |
| --- | --- |
| 1 | 1 s |
| 2 | 4 s |
| 3 | 16 s |
::
```
::

### Title

Use the `title` prop to set the heading of the zoomed view.

::example
```md
::zoom{title="Retry policy"}
| Attempt | Wait |
| --- | --- |
| 1 | 1 s |
| 2 | 4 s |
| 3 | 16 s |
::
```
::

### Group

Use the `group` prop to page through several items in one zoomed view. Arrow keys and the strip of thumbnails move between them.

::example
```md
::zoom{group="tour" title="Before"}
![Filter toolbar wrapping](/before.png)
::

::zoom{group="tour" title="After"}
![Filter toolbar on one row](/after.png)
::
```
::

> [!NOTE]
> Items hidden when the view opens, such as those in a closed tab, are left out of the group.

### Larger image

Use the `data-zoom-src` attribute to load a larger file when the view opens. The view shows the page's image until the larger file has loaded.

```md
![Office correlations dashboard](/dashboard.png){data-zoom-src="/dashboard@2x.png"}
```

### Turn zoom off

Use `zoom=false` to keep one image from zooming. Images inside links never zoom, so they keep their link.

```md
![Company logo](/logo.png){zoom=false}
```

## Examples

### Caption beside the zoom

Use the `data-zoom-aside` attribute to show an element beside the zoomed item at its own size, so a caption stays readable however far the item zooms. It takes a selector. On a narrow screen the caption sits below.

```html
<figure>
  <img data-zoom data-zoom-aside="figcaption" src="pigeons.png" alt="Pigeons on the roof by week">
  <figcaption>Pigeons dip in week 3, when the falcon visited.</figcaption>
</figure>
```

The zoom takes the first match that neither holds the item nor sits in it. It looks in the item's innermost [`data-zoom-context`](#styles-from-ancestors), or else in its parent. comark-annotate uses it for a screenshot's notes.

### Pins over the zoomed view

Listen for `comark-zoom:open` to draw your own pins or controls on the zoomed item. The event's `layer` sits over the zoomed content and has its size.

```ts
document.addEventListener("comark-zoom:open", (event) => {
  const pin = document.createElement("button");
  pin.textContent = "1";
  pin.style.cssText = "position:absolute;left:40%;top:20%";
  event.detail.layer.append(pin);
});
```

Inside an open or change event listener, use `event.detail.copyOf(element)` to find the copy of a page element in the zoomed view, and `event.detail.originalOf(element)` to go back, so a pin can follow what it points at.

## Accessibility

Each item is a tab stop that opens a modal dialog, labelled by its title. Focus stays in the dialog while it is open and returns to the item when it closes. An item inside another one, such as a screenshot in a slide, zooms with it, so only the outer one is a tab stop.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Enter`, `Space` | Opens the focused item. |
| `Escape` | Closes the zoomed view. |
| `ArrowLeft`, `ArrowRight` | Moves to the previous or next item in a group. |
| `Tab`, `Shift+Tab` | Moves focus between the dialog's buttons and thumbnails, and wraps around inside the dialog. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `title` | — | Heading of the zoomed view. |
| `group` | — | Items with the same group page through one zoomed view. |
| `#id`, `.class` | — | Go on the block, as on any other. |

### Image attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `zoom` | `true` | `false` keeps the image from zooming. |
| `data-zoom` | — | Makes an image zoom when the `images` option is `false`. |
| `data-zoom-src` | — | A larger file to load when the view opens. |
| `data-zoom-aside` | — | A selector for an element to show beside the zoomed item. |
| `data-zoom-context` | — | A selector for ancestors whose styles the zoomed copy keeps. |

### Options

The options go under `zoom` in `comarkUi()`, or to `zoom()` when you use it alone. `zoom: false` in `comarkUi()` turns zoom off.

| Option | Default | Description |
| --- | --- | --- |
| `images` | `true` | `false` leaves images alone, so only `::zoom` blocks and images with `data-zoom` zoom. |

### Events

Each event fires on the item.

| Event | Detail | Description |
| --- | --- | --- |
| `comark-zoom:open` | `ZoomDetail` | The view opened. |
| `comark-zoom:change` | `ZoomDetail` | The view moved to another item in its group. |
| `comark-zoom:close` | `{ item }` | The view closed. |

### Event detail

The open and change events expose these `ZoomDetail` fields and methods through `event.detail`:

| Field | Type | Description |
| --- | --- | --- |
| `dialog` | `HTMLElement` | The zoom dialog. |
| `header` | `HTMLElement` | The header for controls above the content. |
| `footer` | `HTMLElement` | The footer for controls below the content. |
| `layer` | `HTMLElement` | An overlay sized to the zoomed content for pins and outlines. |
| `content` | `HTMLElement` | The zoomed copy of the item. |
| `aside` | `HTMLElement \| null` | The column holding a copy of the item's aside, or `null` when absent. |
| `item` | `HTMLElement` | The original item on the page. |
| `index` | `number` | The zero-based position of the current item in `items`. |
| `items` | `HTMLElement[]` | The items in the current group. |

| Method | Returns | Description |
| --- | --- | --- |
| `event.detail.copyOf(element)` | `Element \| null` | The zoomed copy of an element in the item or its aside. |
| `event.detail.originalOf(element)` | `Element \| null` | The original page element for a copy in the zoomed item or aside. |

Both methods return `null` for anything the zoom doesn't show. The close event exposes only `event.detail.item`, the original item that closed.

### Package

comark-ui brings `comark-zoom` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-zoom
```

```ts
import { createHtmlRenderer } from "@comark/html";
import zoom, { components } from "comark-zoom/html";

const render = createHtmlRenderer({ plugins: [zoom()], components });
```

For Vue, React, or Svelte, import from `comark-zoom/vue`, `comark-zoom/react`, or `comark-zoom/svelte`. [Renderers](/guide/renderers/) covers server rendering, pages without a renderer, and zoom with other plugins.

## Theme

The zoomed view follows the shared tokens in [Theming](/guide/theming/), and two variables of its own change the backdrop. The rules sit in a `comark` CSS layer, so a plain rule of your own wins over any of them.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The backdrop |
| `--comark-foreground` | The header's text, the current thumbnail's border |
| `--comark-muted` | The counter |
| `--comark-border` | The thumbnails' borders |
| `--comark-accent` | Hovered close and arrow buttons |
| `--comark-ring` | Focus rings on items and buttons |
| `--comark-radius` | Image, button, and thumbnail corners |
| `--comark-font` | The header |

The tokens resolve on `.cz-dialog`, so tokens set there theme the zoomed view alone.

Content images use the shared radius, `0.625rem` by default. Set `--comark-radius: 0px` on an image to keep its corners square, or on `:root` to use square corners throughout.

### Variables

The zoomed view sits at the end of `body`, so set these on `:root`, `body`, or `.cz-dialog`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cz-backdrop` | `--comark-background` at `--cz-backdrop-opacity` | The backdrop's color |
| `--cz-backdrop-opacity` | `96%` | How much of `--comark-background` the backdrop mixes in |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `[data-zoom]` | An item on the page that zooms |
| `.cz-dialog` | The zoomed view, with `data-aside` when it shows a caption beside the item |
| `.cz-backdrop` | The layer behind everything else |
| `.cz-header`, `.cz-title`, `.cz-count`, `.cz-close` | The top row: title, position in a group, and the close button |
| `.cz-stage`, `.cz-item` | The area the item zooms into, and the zoomed copy |
| `.cz-prev`, `.cz-next` | The arrows of a group, both `.cz-nav` |
| `.cz-aside` | The caption beside the item, from `data-zoom-aside` |
| `.cz-strip`, `.cz-thumb` | The row of thumbnails, and each one, with `aria-current="true"` on the open one |

### Styles from ancestors

The zoomed copy leaves the page, so it loses rules that match through its ancestors, such as `.post img`. Use the `data-zoom-context` attribute to name those ancestors by selector. The copy then goes inside empty copies of every ancestor that matches:

```html
<article class="post">
  <img data-zoom data-zoom-context=".post" src="pigeons.png" alt="Pigeons on the roof by week">
</article>
```

### Example

A dark backdrop that lets the page show through:

```css
:root {
  --cz-backdrop: rgb(0 0 0 / 0.8);
}

.cz-dialog {
  --comark-foreground: #fafafa;
  --comark-muted: #a1a1a1;
}
```

To try it, paste it into Extra CSS in the [playground's Theme pane](/play/#preset=zoom-image).
