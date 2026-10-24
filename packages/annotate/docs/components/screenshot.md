---
title: screenshot
description: An image with marks on it, and its props.
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

## Props

| Prop | |
| --- | --- |
| `src` | Image URL. Required. |
| `alt` | What the screenshot shows. Required. |
| `title` | Heading above the image, and the title of its zoomed view. |
| `href` | The page you captured, linked by its host next to the title. |
| `viewport` | Capture size in pixels, like `1440x900`. A `compare` checks that both sides match. |
