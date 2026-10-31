---
title: Figure
description: Image captions in Markdown, from the title, rendered as native figure and figcaption.
keywords: caption, figcaption, image caption, image title, alt text
tagline: An image with a caption under it, written as an image with a title.
group: Markdown syntax
icon: image
blurb: Image captions from the title
credits: 'After <a href="https://github.com/arve0/markdown-it-implicit-figures">markdown-it-implicit-figures</a>, which reads the caption from the title the same way.'
---

::examples
:::example{label="Caption"}
```md
![The dashboard with three charts of office metrics](/dashboard.png "Office correlations, week 42")
```
:::

:::example{label="In a list"}
```md
1. Open the filters.

   ![Filter toolbar wrapping onto two rows](/before.png "Before: the toolbar wraps")
2. Narrow the window.

   ![Filter toolbar on one row](/after.png "After: one row at any width")
```
:::
::

## Features

- An image alone in its paragraph with a title renders as `<figure>`, with the title in `<figcaption>`.
- The alt text still describes the image to screen readers. The caption is what everyone reads under it.
- A linked image keeps its link, and the caption sits outside it.
- No classes, no styles, and no components, so it works in any renderer.

## Usage

Write the caption as the image's title, the quoted text after its URL. Keep the image alone in its paragraph.

::example
```md
![The dashboard with three charts of office metrics](/dashboard.png "Office correlations, week 42")
```
::

The image keeps its `src`, its alt text, and any `{attributes}`. It loses only the `title`, since the caption now says it:

```html
<figure>
  <img src="/dashboard.png" alt="The dashboard with three charts of office metrics">
  <figcaption>Office correlations, week 42</figcaption>
</figure>
```

### Linked image

Use a link around a captioned image to keep the image clickable, here to the full-size file. The link stays around the image, and the caption sits under it, outside the link.

::example
```md
[![The dashboard with three charts of office metrics](/dashboard.png "Office correlations, week 42")](/dashboard.png)
```
::

> [!NOTE]
> A title on the link instead of the image, `[![alt](src)](url "Title")`, stays the link's tooltip.

### Image in a sentence

Use an image with a title inside a sentence to keep the title as a tooltip. Only an image alone in its paragraph becomes a figure.

```md
The duck ![duck](/duck.png "Gerald") found the race condition.
```

### Unwrap

Use the `unwrap` option to lift every image that stands alone in its paragraph out of the `<p>`, with a title or without. Comark's `autoUnwrap` only does that in list items and blockquotes.

```ts
figure({ unwrap: true });
```

## Examples

### What becomes a figure

An image with a title becomes a figure when it stands alone in its paragraph:

- at the top of the page
- in a list item
- in a blockquote
- in a definition
- in a `::component`, next to other blocks

The caption is plain text, as a title is.

### Inside a component

A `::component` that holds only the image is left alone, and so is an inline `:component[![alt](src "Title")]` alone on its line. Add another block to the component, and its image becomes a figure.

### Alt text and captions

Screen readers read both, so they shouldn't say the same thing. Alt text says what the image shows, for someone who can't see it. The caption says why it's there, for everyone:

```md
![Bar chart: deploys per day, highest on Tuesday](/deploys.png "Most deploys land on Tuesday, after the Monday freeze")
```

### Size block images apart

With `unwrap: true`, an image alone in its paragraph renders as a bare `<img>` with no `<p>` around it. A stylesheet can then size block images apart from the ones inside a sentence with `.prose > img`.

### Styling

The plugin adds no classes and no styles. Browsers indent a figure by 40px on each side. To set it flush with the text and the caption small and muted:

```css
figure {
  margin: 1.5em 0;
}
figcaption {
  margin-top: 0.5em;
  font-size: 0.875em;
  color: #6b7280;
}
```

### With comark-zoom

With [comark-zoom](/zoom/), the image inside a figure zooms as any other image does, in either plugin order.

## API

### Options

The options go under `figure` in `comarkUi()`, or to `figure()` when you use the plugin alone.

| Option | Default | Description |
| --- | --- | --- |
| `unwrap` | `false` | `true` also lifts every image that stands alone in its paragraph out of the `<p>`, with a title or without. |

### Package

comark-ui brings `comark-figure` and registers it. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-figure
```

```ts
import { parseMarkdown } from "comark";
import figure from "comark-figure";

const document = await parseMarkdown(markdown, {
  plugins: [figure()],
});
```
