---
title: Zoom
description: Zoom images and any block like medium-zoom, written in Markdown.
keywords: lightbox, medium-zoom, image zoom, enlarge, fullscreen, gallery, popup, modal, magnify
tagline: Click an image or any block to zoom it out of its place. Escape, Back, or a click around it closes it.
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

Click an item to zoom it; Escape, Back, or a click around it closes it. Enter or Space opens a focused item, and focus returns to it when the view closes.

## Usage

### Images

Content images zoom on their own, except images inside links, which keep their link. The zoomed view shows the image's `alt` text as its title, and an image grows no larger than its natural size, so it stays sharp.

Give an image a `data-zoom-src` to load a larger file when it opens. The zoom shows the page's image until the larger file has loaded, and the strip of a group keeps the page's images. To keep one image from zooming, give it `zoom=false`:

```md
![Company logo](/logo.png){zoom=false}
```

### zoom

Zooms any block: a table, a code block, a diagram, or several of them together.

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

| Prop | |
| --- | --- |
| `title` | Heading of the zoomed view. |
| `group` | Items with the same group page through one zoomed view. |
| `#id`, `.class` | Go on the block, as on any other. |

## Examples

### Groups

Items in one `group` page through a single zoomed view with a strip of them at the bottom. Arrow keys and the strip move between them. Items that are hidden when the view opens, such as those in a closed tab, are left out.

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

### Captions beside the zoom

`data-zoom-aside` names an element, by selector, that the zoomed view shows beside the item at its own size. A caption stays readable however far the item zooms. On a narrow screen it sits below. comark-annotate uses it for a screenshot's notes.

The zoom takes the first match that neither holds the item nor sits in it. It looks in the item's innermost [`data-zoom-context`](#styles-from-ancestors), or else in its parent.

```html
<figure>
  <img data-zoom data-zoom-aside="figcaption" src="pigeons.png" alt="Pigeons on the roof by week">
  <figcaption>Pigeons dip in week 3, when the falcon visited.</figcaption>
</figure>
```

## API

The options go under `zoom` in `comarkUi()`, or to `zoom()` when you use it alone. `zoom: false` in `comarkUi()` turns zoom off.

| Option | Default | |
| --- | --- | --- |
| `images` | `true` | `false` leaves images alone, so only `::zoom` blocks and images you mark with `{data-zoom}` zoom. |

### Events

The zoomed view fires `comark-zoom:open`, `comark-zoom:change`, and `comark-zoom:close` on the item. `open` and `change` carry the dialog's `header` and `footer`, and a `layer` over the zoomed content, sized to it, where a host can draw its own pins or controls.

`copyOf(element)` finds the copy of a page element in the zoomed view, and `originalOf(element)` goes back, so a pin can follow what it points at. Both return `null` for anything the zoom doesn't show.

```ts
document.addEventListener("comark-zoom:open", (event) => {
  const pin = document.createElement("button");
  pin.textContent = "1";
  pin.style.cssText = "position:absolute;left:40%;top:20%";
  event.detail.layer.append(pin);
});
```

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

The zoomed copy leaves the page, so it loses rules that match through its ancestors, such as `.post img`. An item that needs them names those ancestors with `data-zoom-context`, a selector. The copy then goes inside empty copies of every ancestor that matches:

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
