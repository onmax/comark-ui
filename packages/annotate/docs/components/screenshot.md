---
title: screenshot
description: An image with marks on it, and its props.
tagline: An image with hand-drawn marks on it, and their notes under it or beside it.
---

An image with marks on it. Each `annotation` inside it draws one mark, and any other content becomes the caption.

::example
```md
::screenshot{src="/after.png" alt="Filter toolbar on one row" title="After" href="https://pr42.preview.example.com/plan"}
:::annotation{x=67.9 y=34.8 w=13 h=14.2}
Extra filters collapse into **+2 filters**.
:::
::
```
::

## Features

- Each [`annotation`](/annotate/components/annotation/) inside it draws one mark and its note.
- A click anywhere on the screenshot zooms it, with its notes beside it.
- The Copy button copies it as a PNG with its marks and notes drawn in.
- It reads the same without a script.

## Usage

Use the `src` prop for the image and the `alt` prop to say what it shows. Both are required.

```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
::
```

### Title

Use the `title` prop to put a heading above the image. It also titles the zoomed view, which shows the `alt` text without it.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard" title="Correlations"}
:::annotation{x=82.4 y=5.3 w=14.2 h=8.8}
**Export CSV** includes the filters you set.
:::
::
```
::

### Link

Use the `href` prop to link the page you captured. The link shows the page's host next to the title.

::example
```md
::screenshot{src="/after.png" alt="Filter toolbar on one row" href="https://pr42.preview.example.com/plan"}
:::annotation{x=67.9 y=34.8 w=13 h=14.2}
Extra filters collapse into **+2 filters**.
:::
::
```
::

> [!NOTE]
> `href` must be an http:// or https:// URL with a host.

### Viewport

Use the `viewport` prop to record the capture size in pixels, like `1440x900`. The plugin then judges where each number fits against the image's real shape. A `compare` checks that both its screenshots have the same viewport.

```md
::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::
```

### Ink

Use the `ink` prop to color every mark and note that doesn't set its own `color`. It takes the same values as an annotation's [`color`](/annotate/components/annotation/#color).

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard" ink="blue"}
:::annotation{x=82.4 y=5.3 w=14.2 h=8.8}
**Export CSV** includes the filters you set.
:::

:::annotation{x=5.3 y=46 w=21.7 h=9.3 mark="cross" color="red"}
This filter ignores the moon phase.
:::
::
```
::

### Caption

Write any content after the annotations to give the screenshot a caption. It sits above the numbered notes.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=82.4 y=5.3 w=14.2 h=8.8}
**Export CSV** includes the filters you set.
:::

Captured on the staging dashboard, after the filter fix.
::
```
::

## Examples

### Copy a screenshot

Press a screenshot's Copy button, or focus it and press Ctrl+C (⌘C on a Mac). You get a PNG with the marks and notes drawn in. The browser's own Copy Image gives you the same PNG once the pointer has been over the screenshot.

Copying needs setup in two cases:

- An image from another origin needs CORS headers from its server.
- A page in an iframe needs `allow="clipboard-write"` on the frame.

## Accessibility

The image keeps its `alt` text. Each numbered mark is an image named by its number and note, such as "Annotation 1: Extra filters collapse into +2 filters." A side note's mark is named "Side note:" and its note. The arrows are hidden from screen readers.

The image is one tab stop, and it opens the [zoomed view](/zoom/). The Copy button is labelled "Copy the screenshot with its marks", and a status announces "Copied" once the PNG is on the clipboard.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Enter`, `Space` | Opens the focused screenshot in the zoomed view. |
| `Escape` | Closes the zoomed view. |
| `Ctrl+C`, `⌘C` | Copies the focused or zoomed screenshot with its marks, unless text is selected. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `src` | — | Image URL. Required. |
| `alt` | — | What the screenshot shows. Required. |
| `title` | — | Heading above the image, and the title of its zoomed view. |
| `href` | — | The page you captured, linked by its host next to the title. An http:// or https:// URL with a host. |
| `viewport` | — | Capture size in pixels, like `1440x900`. A `compare` checks that both sides match. |
| `ink` | — | The color of every mark and note that doesn't set its own `color`. Takes the same values as `color`: `red`, `amber`, `green`, `blue`, `violet`, `gray`, or a 3- or 6-digit hex color. Without it, marks take the compare's `ink`, or else violet. |

### Issues

The plugin adds these problems to `meta.issues`:

- `src` or `alt` is missing.
- `href` isn't an http:// or https:// URL with a host.
- `viewport` isn't a size in pixels, like `1440x900`.
- `ink` isn't a named color or a 3- or 6-digit hex color.
- A prop isn't one of the above. Likely slips such as `label`, `url`, `color`, `caption`, `width`, and `height` get a hint.
- A `:bound` prop resolves to nothing, or to an unsafe URL.
- A `screenshot`, `compare`, or `annotation` sits inside the caption.
- Side notes on one side sit so close that they would overlap.
- Two numbers overlap at every corner of their marks.
- More than 40 annotations sit in one screenshot or compare, past which hovering stops linking marks to notes.

Each has its own rule in [Doctor](/doctor/). [Annotate](/annotate/#issues) covers how issues name their block.
