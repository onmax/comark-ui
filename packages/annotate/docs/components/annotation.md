---
title: annotation
description: One mark on a screenshot and its note, and its props.
tagline: One hand-drawn mark on a screenshot, and the note that explains it.
---

One mark on a screenshot. Its content is the note.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=82.4 y=5.3 w=14.2 h=8.8 color="blue"}
**Export CSV** includes the filters you set.
:::

:::annotation{x=66.1 y=17 w=30.5 h=24.6 side="right" color="green"}
r now counts the office cat.
:::
::
```
::

## Features

- A note goes in the numbered list under the image.
- A side note sits beside, above, or below the image instead, with an arrow to the mark.
- Hover a mark to highlight its note, or a note to highlight its mark.
- Each mark is hand-drawn and a little different, but the same Markdown always draws the same marks.
- Props go inline, in a YAML props block, or bound with `:x`.

## Usage

Use the `x`, `y`, `w`, and `h` props to mark an area of the image, as percentages of it. Write the note as the block's content.

```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=82.4 y=5.3 w=14.2 h=8.8}
**Export CSV** includes the filters you set.
:::
::
```

> [!NOTE]
> All four are required. They're numbers without `%`: `x` and `y` from 0 to 100, `w` and `h` above 0 and up to 100. Keep `x + w` and `y + h` within 100.

### Mark

Use the `mark` prop to pick the shape. `box` is the default.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=82.4 y=5.3 w=14.2 h=8.8}
`box` frames an element.
:::

:::annotation{x=35.8 y=32.3 w=18.8 h=6.6 mark="circle"}
`circle` rings a small detail.
:::

:::annotation{x=3.5 y=5.9 w=26.8 h=7.7 mark="underline" color="blue"}
`underline` marks text.
:::

:::annotation{x=61.2 y=76.6 w=18 h=9.7 mark="highlight" color="amber"}
`highlight` washes over an area.
:::

:::annotation{x=5.3 y=46 w=21.7 h=9.3 mark="cross" color="red"}
`cross` strikes something out.
:::

:::annotation{x=85 y=46 w=9.7 h=9.3 mark="check" color="green"}
`check` approves and sits beside its target.
:::
::
```
::

- `line` runs through the middle of its box along its longer side, for a fold or a limit.
- `bracket` stands on the edge that faces its side note, or the left edge without one. It spans a run of rows or a group without covering it.
- `none` draws nothing and leaves the pointing to a side note's arrow.

> [!NOTE]
> `mark="none"` needs a `side`.

### Color

Use the `color` prop to say what a mark means. Each named color has one meaning:

| Color | Meaning |
| --- | --- |
| `violet` | Points something out. It's the default, and reads on light and dark screenshots. |
| `red` | Flags a problem. |
| `amber` | A warning. |
| `green` | A fix. |
| `blue` | A second voice beside the default. |
| `gray` | Anything neutral. |

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=5.3 y=46 w=21.7 h=9.3 color="red"}
This filter ignores the moon phase.
:::

:::annotation{x=85 y=46 w=9.7 h=9.3 mark="check" color="green"}
**Apply** waits until every filter is set.
:::

:::annotation{x=82.4 y=5.3 w=14.2 h=8.8 color="#e11d48"}
**Export CSV** includes the filters you set.
:::
::
```
::

Each named color has a dark-mode value. A 3- or 6-digit hex color like `#e11d48` works too, and its stamp gets a white or dark number, whichever reads better. Without a `color`, the mark takes its screenshot's or compare's `ink`.

### Side note

Use the `side` prop to move the note out of the list to the `left`, `right`, `top`, or `bottom` of the image, with a hand-drawn arrow to its mark. Side notes have no number.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=37 y=33.1 w=16.4 h=5.2 mark="underline" side="top" color="red"}
Bugs fixed fall for the first time this quarter. So do the ducks.
:::

:::annotation{x=66.1 y=17 w=30.5 h=24.6 side="right"}
r now counts the office cat.
:::

:::annotation{x=4 y=77.3 w=75.5 h=8.2 mark="highlight" side="left" color="amber"}
Week 15 is missing for the pigeons.
:::
::
```
::

> [!NOTE]
> On narrow screens, side notes drop under the image and the arrows hide. Each note and its target get a matching letter instead.

### Note position

Use the `at` prop to move a side note along its margin, as a percentage of the image. It runs across the image for `top` and `bottom`, and down it for `left` and `right`. Without it, the note sits level with the arrow's point. A note moved off to one side starts where its arrow leaves it and reads away from the point.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=37 y=33.1 w=16.4 h=5.2 mark="none" side="top" at=58 to="44,33"}
Bugs fixed fell with the duck supply.
:::

:::annotation{x=4 y=77.3 w=92 h=8.2 mark="none" side="bottom" at=42 to="55,81"}
The pigeons ate week 15.
:::
::
```
::

> [!NOTE]
> `at` needs a `side`.

### Arrow target

Use the `to` prop to aim the arrow at one point, as two percentages of the image, like `to="42,18"`. Without it, the arrow lands on the middle of the mark's edge that faces the note. It suits `mark="none"`, where the arrow alone points.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=66.1 y=17 w=30.5 h=24.6 mark="none" side="right" to="80,30"}
r now counts the office cat.
:::
::
```
::

> [!NOTE]
> `to` needs a `side`.

## Examples

### Place marks on their target

Measure the element in the page you captured and divide by the viewport. Don't estimate from the image.

```js
const r = element.getBoundingClientRect();
const box = {
  x: (r.x / innerWidth) * 100,
  y: (r.y / innerHeight) * 100,
  w: (r.width / innerWidth) * 100,
  h: (r.height / innerHeight) * 100,
};
```

For a full-page screenshot, add the scroll offset and divide by the page size instead.

### Where the numbers go

Each number sits on a corner of its mark. It takes the first of top left, top right, bottom left, and bottom right that's clear of other numbers, marks, and arrows. Where it would hang past the image's edge, it lines up with the mark's edge instead.

Set [`viewport`](/annotate/components/screenshot/#viewport) on the screenshot so the plugin judges corners against the image's real shape. If two numbers overlap at every corner, the plugin reports both annotations.

### Side notes that fit

The plugin reports side notes that sit close together on one margin. It can't measure the text, so check the rendered page too. If two notes collide, move one with `at`, to another side, or into the list.

In a [compare](/annotate/components/compare/#side-notes-in-a-pair) side by side, only notes above and below the image keep their arrow. In a slider, every note joins the list.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `x` `y` `w` `h` | — | The marked area, as percentages of the image: numbers without `%`, `x` and `y` from 0 to 100, `w` and `h` above 0 and up to 100. All four are required. |
| `mark` | `box` | `box`, `circle`, `underline`, `line`, `highlight`, `bracket`, `cross`, `check`, or `none`. `none` needs a `side`. |
| `color` | `violet` | `violet`, `red`, `amber`, `green`, `blue`, `gray`, or a 3- or 6-digit hex color like `#e11d48`. Without it, the screenshot's or compare's `ink`. |
| `side` | — | `left`, `right`, `top`, or `bottom` puts the note beside, above, or below the image with an arrow. |
| `at` | Level with the arrow's point | Where a side note sits along its margin, as a percentage of the image. Needs a `side`. |
| `to` | The middle of the mark's edge that faces the note | The point the arrow lands on, as two percentages of the image, like `to="42,18"`. Needs a `side`. |

### Issues

The plugin adds these problems to `meta.issues`:

- `x`, `y`, `w`, or `h` is missing, isn't a number, or is out of range.
- The box runs past the image edge.
- `x`, `y`, `w`, and `h` are all 1 or less, like fractions.
- `mark` isn't one of the marks, or is `none` without a `side`.
- `color` isn't a named color or a 3- or 6-digit hex color.
- `side` isn't `left`, `right`, `top`, or `bottom`.
- `at` or `to` isn't a percentage, or has no `side`.
- The annotation has no note.
- A `screenshot`, `compare`, or `annotation` sits inside the note.
- The annotation sits outside a screenshot.
- An unknown prop. Likely slips such as `width`, `height`, `colour`, `left`, `top`, `target`, and `label` get a hint.

Each has its own rule in [Doctor](/doctor/). [Annotate](/annotate/#issues) covers how issues name their block.
