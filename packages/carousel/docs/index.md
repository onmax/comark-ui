---
title: Carousel
description: A carousel of any Markdown content, written in Markdown.
keywords: slider, slideshow, slides, gallery, swiper, walkthrough, scroll snap
tagline: A row of slides that scroll and snap, holding images, code, or any other block.
group: Page behavior
icon: gallery-horizontal-end
blurb: Slides of any content
---

::examples
:::example{label="Images"}
```md
::carousel{title="Filters"}
![Filter toolbar wrapping](/before.png)

![Filter toolbar on one row](/after.png)

![Office correlations dashboard](/dashboard.png)
::
```
:::

:::example{label="Titled slides"}
````md
::carousel{title="Setup"}
:::slide{title="Install"}
```sh
pnpm add comark @comark/html comark-carousel
```
:::

:::slide{title="Register"}
Pass the plugin and its `components` to the renderer.
:::

:::slide{title="Write"}
> Each `:::slide` is one slide, however many blocks it holds.
:::
::
````
:::

:::example{label="Two columns"}
```md
::carousel{columns=2}
![Before](/before.png)

![After](/after.png)
::
```
:::
::

## Features

- Every block inside `::carousel` is a slide, and a `:::slide` holds several blocks.
- Slides scroll and snap with no script, with a scrollbar to reach the others.
- The script swaps the scrollbar for arrows, a slide counter, and arrow keys.
- A click zooms a slide, and the zoomed view pages through the others.
- Screen readers hear each slide's position, such as "2 of 3".

## Usage

Put blocks inside `::carousel`. Each one is a slide.

::example
```md
::carousel
![Filter toolbar wrapping](/before.png)

![Filter toolbar on one row](/after.png)
::
```
::

### Title

Use the `title` prop to name the carousel for screen readers. It's also the heading of a zoomed slide with no title or image of its own.

::example
```md
::carousel{title="Filters"}
![Filter toolbar wrapping](/before.png)

![Filter toolbar on one row](/after.png)
::
```
::

> [!NOTE]
> Each slide takes `title` and `zoom` while parsing. Bind them to the document or its frontmatter, not to render-time data.

### Columns

Use the `columns` prop to show 2 or 3 slides at once on a wide page. A narrow page shows one at a time.

::example
```md
::carousel{columns=2}
![Before](/before.png)

![After](/after.png)
::
```
::

> [!NOTE]
> `columns` takes 1, 2, or 3. Any other value adds an issue.

### Zoom

Use the `zoom` prop to turn zoom off. Slides then don't zoom on a click and aren't tab stops.

```md
::carousel{zoom=false}
![Filter toolbar wrapping](/before.png)

![Filter toolbar on one row](/after.png)
::
```

### Slides

Use `:::slide` to put several blocks in one slide. Use its `title` prop to set the slide's heading when it's zoomed.

::example
````md
::carousel{title="Setup"}
:::slide{title="Install"}
```sh
pnpm add comark @comark/html comark-carousel
```
:::

:::slide{title="Register"}
Pass the plugin and its `components` to the renderer.
:::
::
````
::

> [!NOTE]
> Once a carousel has a `:::slide`, only its slides count, and the plugin drops and reports anything else. A `:::slide` outside a carousel renders as plain content.

## Examples

### Zoom a slide

The zoomed view shows the other slides in a strip at the bottom. Paging there moves the carousel too, so closing it lands on the slide you were viewing. Zoom comes from [comark-zoom](/zoom/), which the package installs.

For annotated screenshots in a carousel, see the [recipe](/recipes/carousel/).

### Images in slides

An image alone in a slide or in its paragraph is centered, and so is a link around one. An image inside a sentence stays in the text.

```md
::carousel
![Office correlations dashboard](/dashboard.png)

The dashboard ![icon](/dashboard.png) sits in this sentence.
::
```

## Accessibility

The carousel follows the [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/). It's a region that screen readers announce as a carousel, named by its `title`, or "Carousel" without one. Each slide is a group announced as a slide and named by its position, such as "2 of 3".

The counter is a polite live region, so screen readers read the new position after each page. The arrows are buttons named "Previous slide" and "Next slide". At either end an arrow is marked disabled but keeps its focus, so the keys keep working.

When the slides zoom, each slide is a tab stop. Enter or Space opens it in the zoomed view, and focus returns to the slide when the view closes.

When the reader prefers reduced motion, paging jumps instead of scrolling smoothly.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `ArrowLeft`, `ArrowRight` | With focus anywhere in the carousel, including a link or a button in a slide, pages to the previous or next slide. On a right-to-left page they follow the reading direction. |
| `Enter`, `Space` | On a slide, opens it in the zoomed view. On an arrow, pages. |
| `Tab`, `Shift+Tab` | Moves focus through the slides, when they zoom, and then the arrows. |
| `Escape` | Closes the zoomed view. |

The carousel ignores the arrow keys when pressed with Alt, Ctrl, Meta, or Shift. It also leaves them to whatever has focus and uses them:

- A form field, a video or audio player, a `<summary>`, or editable text.
- A tab list, slider, radio group, list box, combo box, spin button, menu, menu bar, or tree.
- A wide code block or table in a slide that scrolls sideways.

In the zoomed view, the arrow keys page through the zoomed slides instead.

## API

### Props

Props can be inline or bound, such as `:columns="2"`.

#### Carousel

| Prop | Default | Description |
| --- | --- | --- |
| `title` | `"Carousel"` | The name screen readers read, and the heading of a zoomed slide that has no title or image of its own. Bind it to the document or its frontmatter, not to render-time data. |
| `columns` | `1` | How many slides show at once on a wide page: `1`, `2`, or `3`. A narrow page shows one. |
| `zoom` | `true` | `false` turns zoom off. Bind it to the document or its frontmatter, not to render-time data. |

#### Slide

| Prop | Default | Description |
| --- | --- | --- |
| `title` | The carousel's `title`, unless the slide holds an image | The heading of the slide when it's zoomed. An image names its zoomed view by its alt text. |

### Options

comark-carousel takes no options. `carousel: false` in `comarkUi()` turns it off.

### Issues

The plugin adds each carousel's problems to `meta.issues`, as [Validation](/guide/validation/) describes:

```txt
carousel 2 ("Setup") drops the paragraph "Pass the plugin" because it sits outside every :::slide; move it into a :::slide.
```

It reports:

- Content outside every `:::slide`.
- A carousel with no slides.
- `columns` that isn't 1, 2, or 3.
- A `:::slide` outside a carousel.
- A `:zoom` or `:title` that reads render-time data or a missing key.
- A prop it doesn't know.

Each one has its own rule in [Doctor](/doctor/).

### Package

comark-ui brings `comark-carousel` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-carousel
```

```ts
import { createHtmlRenderer } from "@comark/html";
import carousel, { components } from "comark-carousel/html";

const render = createHtmlRenderer({ plugins: [carousel()], components });
```

For Vue, React, or Svelte, import from `comark-carousel/vue`, `comark-carousel/react`, or `comark-carousel/svelte`. When you render on a server, import `comark-carousel/style.css` and `comark-zoom/style.css` with your own styles. [Renderers](/guide/renderers/) covers the rest.

## Theme

The arrows, counter, and slide panels use the shared tokens in [Theming](/guide/theming/), plus four variables for spacing and sizes. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The arrows' faces |
| `--comark-foreground` | The arrows' icons, and the tint of the slide panels |
| `--comark-muted` | The counter |
| `--comark-border` | The arrows' borders |
| `--comark-accent` | Hovered arrows |
| `--comark-ring` | The focus ring on the arrows |
| `--comark-radius` | The slide panels' corners |

The zoomed view comes from comark-zoom and has a [theme](/zoom/#theme) of its own.

### Variables

Set these on `.cc` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cc-gap` | `1rem` | The space between slides |
| `--cc-surface` | `--comark-foreground` at 4% | The panel behind each slide |
| `--cc-padding` | `1rem` | The space inside each panel, halved on a narrow page |
| `--cc-button-size` | `2rem` | The arrows' width and height, at least `2.5rem` on touch screens |

Each slide sits on a soft panel as tall as the tallest one, so slides of different heights line up. To drop the panel, set `--cc-surface: transparent` and `--cc-padding: 0`.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cc` | The carousel, with `data-carousel-columns` when it shows 2 or 3 at a time, and `data-carousel-fits` when every slide fits at once |
| `.cc-track` | The row that scrolls |
| `.cc-slide` | Each slide |
| `.cc-controls` | The row under the slides, shown once the script runs |
| `.cc-count` | The position, such as `1 / 3` |
| `.cc-step` | An arrow, with `aria-disabled="true"` at either end |
| `[data-carousel-ready]` | On `<html>` once the script runs. Without it, the track shows its scrollbar instead of arrows |

### Example

Wider gaps, no panels, and bigger arrows:

```css
:root {
  --cc-gap: 2rem;
  --cc-surface: transparent;
  --cc-padding: 0;
  --cc-button-size: 2.5rem;
}
```

To try it, paste it into Extra CSS in the [playground's Theme pane](/play/#preset=carousel-images).
