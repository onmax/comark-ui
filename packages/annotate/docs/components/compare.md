---
title: compare
description: Two screenshots side by side or under a slider, and their props.
tagline: Two screenshots of one view, before and after a change, side by side or under a slider.
---

Two screenshots of one view, before and after a change. They're titled **Before** and **After** unless they set their own `title`.

::example
```md
::compare{title="Toolbar alignment"}
:::screenshot{src="/before.png" alt="Toolbar wrapping" viewport="640x250"}
::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" color="red"}
**Apply** sits lower than the chips.
::::
:::

:::screenshot{src="/after.png" alt="Toolbar on one row" viewport="640x250"}
::::annotation{x=82.5 y=34.8 w=10.5 h=14.2 mark="check" color="green"}
Fixed.
::::
:::
::
```
::

## Features

- The two screenshots sit side by side, and on a narrow screen they show one at a time.
- They zoom as one gallery.
- Notes are numbered on from the first screenshot to the second.
- A slider lays the pair in one frame, with a divider to drag.
- Without the script, a slider's screenshots stack.

## Usage

Put exactly two [`screenshot`](/annotate/components/screenshot/) blocks inside, the one before the change first.

```md
::compare
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row"}
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row"}
:::
::
```

> [!NOTE]
> Give both screenshots the same `viewport`, since screenshots of different sizes can't be compared. The plugin checks it.

### Title

Use the `title` prop to say what the comparison shows. Side by side, it's the name screen readers read, and defaults to "Comparison". In a slider, it titles the zoomed view, and defaults to the screenshots' titles, such as "Before / After".

```md
::compare{title="Toolbar alignment"}
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row"}
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row"}
:::
::
```

### Slider

Use the `mode` prop set to `slider` to lay the two screenshots in one frame, Before left of a divider and After right of it. Use it for a small change in one spot, so the reader sees it at full width.

::example
```md
::compare{mode="slider"}
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" color="red"}
**Apply** sits 6px lower than the chips.
::::
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check" color="green"}
**Apply** lines up with the chips.
::::
:::
::
```
::

- Drag anywhere on the pair to move the divider, or focus its handle and use the arrow keys.
- A click that doesn't drag zooms the pair.
- Side notes join the numbered list.

### Ink

Use the `ink` prop to color every mark and note in both screenshots that doesn't set its own `color`. A screenshot's own `ink` wins.

::example
```md
::compare{ink="blue"}
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle"}
**Apply** sits 6px lower than the chips.
::::
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check"}
**Apply** lines up with the chips.
::::
:::
::
```
::

## Examples

### Side notes in a pair

Side by side, a note with `side="left"` or `side="right"` joins the numbered list under its screenshot. Notes with `side="top"` and `side="bottom"` stay above and below, and both images keep the same room for them so they line up.

::example
```md
::compare
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" side="top" color="red"}
**Apply** sits 6px lower than the chips.
::::
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check" side="right" color="green"}
**Apply** lines up with the chips.
::::
:::
::
```
::

## Accessibility

Side by side, the pair is a carousel region named by its `title`. Each screenshot is a slide, such as "1 of 2", and a tab stop that opens the [zoomed view](/zoom/).

In a slider, the pair is one tab stop that zooms. Its divider is a slider named "Divider between Before and After", with a value such as "Before 50%, After 50%". It takes the arrow keys on the page and in the zoomed view.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Enter`, `Space` | Opens the focused screenshot, or the slider's pair, in the zoomed view. |
| `ArrowLeft`, `ArrowRight` | Side by side, moves to the other screenshot when they show one at a time, and in the zoomed view. |
| `ArrowLeft`, `ArrowDown` | On the slider's divider, moves it 5% left. |
| `ArrowRight`, `ArrowUp` | On the slider's divider, moves it 5% right. |
| `PageDown`, `PageUp` | On the slider's divider, moves it 25% left or right. |
| `Home`, `End` | On the slider's divider, moves it to the left or right edge. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `title` | "Comparison" | What the comparison shows. Screen readers read it side by side. In a slider, it titles the zoomed view, and defaults to the screenshots' titles joined by " / ". |
| `mode` | `columns` | `columns` puts the screenshots side by side. `slider` lays one over the other with a divider to drag. |
| `ink` | — | The color of every mark and note in both screenshots that doesn't set its own. A screenshot's own `ink` wins. |
| `id` | — | An id for the comparison, such as `#fig-toolbar`, that links and [comark-xref](/xref/) references point at. |

### Issues

The plugin adds these problems to `meta.issues`:

- The compare doesn't hold exactly two screenshots.
- It holds something besides screenshots.
- Both screenshots show the same image.
- The two screenshots' `viewport` sizes differ.
- `mode` isn't `columns` or `slider`.
- `ink` isn't a named color or a 3- or 6-digit hex color.
- An unknown prop. `label`, `color`, and `viewport` get a hint.

Each has its own rule in [Doctor](/doctor/). [Annotate](/annotate/#issues) covers how issues name their block.
