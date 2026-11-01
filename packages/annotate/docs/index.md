---
title: Annotate
description: Hand-drawn marks, numbered notes, and arrows on screenshots, written in Markdown.
keywords: image annotation, markup, highlight, circle, underline, box, pin, before and after, side by side, compare, PR evidence, visual review, bug report, design review, AnnotationKit
tagline: Hand-drawn marks, numbered notes, and arrows on screenshots, and before/after comparisons of them.
group: Review blocks
icon: scribble-loop
blurb: Marks and notes on screenshots
credits: 'Marks from <a href="https://annotationkit.vercel.app">AnnotationKit</a>.'
---

::examples
:::example{label="Before / after"}
```md
::compare
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=4.5 y=28.7 w=90.9 h=44.4 color="red"}
Moon phase and vibes don't fit, so the toolbar wraps and pushes the table down.
::::

::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" color="red"}
**Apply** sits 6px lower than the chips.
::::
:::

:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=68 y=33.1 w=13.3 h=16 mark="highlight" color="blue"}
Moon phase and vibes collapse into **+2 filters**.
::::

::::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check" color="green"}
**Apply** lines up with the chips.
::::
:::
::
```
:::

:::example{label="Before / after slider"}
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
:::

:::example{label="Arrows only"}
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=37 y=33.1 w=16.4 h=5.2 mark="none" side="top"}
Bugs fixed fell with the duck supply.
:::

:::annotation{x=66.1 y=17 w=30.5 h=24.6 mark="none" side="top"}
r now counts the office cat.
:::

:::annotation{x=4 y=77.3 w=92 h=8.2 mark="none" side="left"}
The pigeons ate week 15.
:::
::
```
:::

:::example{label="Margin notes"}
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=37 y=33.1 w=16.4 h=5.2 mark="none" side="top" at=58 to="44,33"}
Bugs fixed fell with the duck supply.
:::

:::annotation{x=66.1 y=17 w=30.5 h=24.6 mark="circle" side="right"}
r now counts the office cat.
:::

:::annotation{x=4 y=77.3 w=92 h=8.2 mark="none" side="bottom" at=42 to="64,84"}
The pigeons ate week 15.
:::
::
```
:::

:::example{label="Side notes"}
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

:::annotation{x=85 y=46 w=9.7 h=9.3 mark="circle"}
**Apply** waits until every filter is set, moon phase included.
:::
::
```
:::

:::example{label="Marks"}
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
:::
::

## Features

- Hover a mark to highlight its note, or a note to highlight its mark.
- Click a screenshot to zoom it, with its notes beside it.
- Copy a screenshot as a PNG with its marks and notes drawn in.
- Compare two screenshots side by side, or one over the other with a slider.
- It all reads the same without a script.
- [zoom](/zoom/) and [carousel](/carousel/) come with the package.

## Usage

Put each `annotation` inside the `screenshot` it marks. Its content is the note.

```md
::screenshot{src="/after.png" alt="Filter toolbar on one row" title="After" href="https://pr42.preview.example.com/plan"}
:::annotation{x=67.9 y=34.8 w=13 h=14.2}
Extra filters collapse into **+2 filters**.
:::
::
```

Props go inline, in a YAML props block, or bound with `:x`.

### Screenshot

Use [`screenshot`](/annotate/components/screenshot/) for an image with marks on it. Other content becomes its caption.

### Annotation

Use [`annotation`](/annotate/components/annotation/) for one mark and its note, numbered under the image or beside it with an arrow.

### Compare

Use [`compare`](/annotate/components/compare/) to show two screenshots side by side, or one over the other with a slider.

## Examples

### Share a screenshot

The Copy button copies a screenshot as a PNG with its marks and notes. The [screenshot page](/annotate/components/screenshot/#copy-a-screenshot) has the keys and the setup some pages need.

### Side notes

Give an annotation a `side` to put its note beside, above, or below the image, with a hand-drawn arrow to its mark. Add `mark="none"` to point without drawing a mark.

::example
```md
::screenshot{src="/dashboard.png" alt="Office correlations dashboard"}
:::annotation{x=66.1 y=17 w=30.5 h=24.6 mark="none" side="right"}
r now counts the office cat.
:::
::
```
::

The [annotation page](/annotate/components/annotation/#side-note) covers where side notes sit and how to keep them apart.

### Place marks on their target

Measure each element in the page you captured instead of estimating from the image. The [annotation page](/annotate/components/annotation/#place-marks-on-their-target) shows how.

### Page through screenshots across a page

The [recipes](/recipes/zoom/) show how to page through screenshots spread across a page, or through a flow one step at a time.

## API

### Options

A screenshot reserves its space from `viewport`, or from a data URI's size. `annotate({ size: true })` also measures remote images at render time. Use it only for trusted documents, since its requests follow redirects and can reach private networks. `annotate({ size: false })` uses only `viewport`. In `comarkUi()`, these go under `annotate`, and `annotate: false` turns the plugin off.

### CLI

The package has a small CLI that knows zoom and carousel too.

| Command | Description |
| --- | --- |
| `check` | Lists every problem in one or more files, and exits with 1 if it finds any. |
| `render` | Writes a standalone page next to each file, or to `-o` for one file. Screenshot it to check that each mark sits on its target. |

Install comark-annotate as a direct dependency of the workspace package where you run the CLI, at the exact version of the project's Comark UI packages: `pnpm add -D comark-annotate@<version>`. Add `-w` at the workspace root. With no Comark UI packages installed, leave out `@<version>`. Then run the local executable:

```sh
vp exec comark-annotate check duck-audit.md pigeons.md
vp exec comark-annotate render duck-audit.md -o duck-audit.html
```

`vp` is the [global Vite+ CLI](https://viteplus.dev/guide/global-cli). Without it, use `pnpm exec` for `vp exec` and `pnpm dlx` for `vp dlx`.

pnpm links the executable only for a direct dependency. When comark-annotate is only transitive, npx stops with `comark-annotate: not found`, and `@latest` can run a different release from the project's renderers.

### Issues

The plugin adds each problem to `meta.issues`, as [Validation](/guide/validation/) describes. Each issue names its block:

- A screenshot by its `src`, or by its position and `alt` when another screenshot has the same `src`.
- A compare by its position, and its `title` if it has one.
- An annotation by its position in its screenshot.

```txt
screenshot "after.png", annotation 2: the box runs past the image edge. Keep x + w and y + h within 100.
```

It also reports an unknown prop, with the valid ones, and a `:bound` prop that points at missing frontmatter. The renderer resolves bindings to `data` or `props`. Each block's page lists the rest:

- [screenshot](/annotate/components/screenshot/#issues)
- [annotation](/annotate/components/annotation/#issues)
- [compare](/annotate/components/compare/#issues)

Each kind of problem has its own rule in [Doctor](/doctor/), with an example and its fix.

### Package

[comark-ui](/getting-started/) brings `comark-annotate` and registers it. To use it alone, install it and pass the HTML renderers as `components`:

```sh
pnpm add comark @comark/html comark-annotate
```

```ts
import { createHtmlRenderer } from "@comark/html";
import annotate, { components } from "comark-annotate/html";

const render = createHtmlRenderer({ plugins: [annotate()], components });
const html = await render(markdown);
```

Annotate renders only to HTML. [Renderers](/guide/renderers/) covers using it with other plugins, a strict Content Security Policy, and untrusted notes.

The comark-ui agent skill knows the syntax, how to measure marks, and how to check the result. Install it with `vp dlx skills add onmax/comark-ui`, and see [Agents](/guide/agents/).

## Theme

Screenshots and comparisons follow the page's theme, but mark colors don't, because each one means something. The rules sit in a `comark` CSS layer, so any plain rule of your own wins. `::diff` is in [comark-diff](/diff/), with its own [Theme section](/diff/#theme).

### Shared tokens

Annotate reads these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | The Copy button, the slider's line and grip, the ring around stamps |
| `--comark-foreground` | The Copy button's icon, the slider's grip, the status after a copy |
| `--comark-border` | The outline around screenshots, the Copy button, the slider's grip |
| `--comark-accent` | The hovered Copy button |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners of screenshots and notes |
| `--comark-shadow` | The slider's handle and grip |
| `--comark-font` | Stamp numbers, the status after a copy |

### Variables

Set them on `.ca`, the root of every block:

| Variable | Default | Used for |
| --- | --- | --- |
| `--ca-color` | `var(--ca-violet)` | Marks, arrows, and notes without a `color` |
| `--ca-solid` | `var(--ca-violet-solid)` | Their stamps, and their strokes in dark mode |
| `--ca-ink` | `var(--ca-violet-ink)` | The number on their stamps |
| `--ca-red` to `--ca-gray` | `--comark-danger`, `#f5a524`, `--comark-success`, `#0581e6`, `#8b5cf6`, `#71717a`; the literals lighter in dark mode | Marks, arrows, and notes in red, amber, green, blue, violet, and gray |
| `--ca-red-solid` to `--ca-gray-solid` | `#d01d21`, `#f59e0b`, `#037e3f`, `#0267c7`, `#7c3aed`, `#52525b` | Stamps in each named color, and its strokes in dark mode |
| `--ca-red-ink` to `--ca-gray-ink` | `#fff`, and `#1c1917` for amber | The number on a stamp in each named color |
| `--ca-ring` | `--comark-background` | The ring that parts a stamp from the screenshot |
| `--ca-note-font` | `comark-caveat, cursive` | Side notes and titles. `inherit` uses the page font. |
| `--ca-note-size` | `1.25em` | Side notes |
| `--ca-label-size` | `1.5em` | A screenshot's title |
| `--ca-gutter` | `10rem` | The room beside the image for `side="left"` and `side="right"` notes |
| `--ca-top-gutter` | `5rem` | The room above the image for `side="top"` notes |
| `--ca-bottom-gutter` | `5rem` | The room below the image for `side="bottom"` notes |
| `--ca-gap` | `1.25rem` | The space between a side note and the image, where its arrow runs |

A screenshot's or compare's `ink` sets `--ca-color`, `--ca-solid`, and `--ca-ink` for its annotations. An annotation's `color` sets them on its own mark and note, so it wins over `.ca`. The Caveat font is inlined with the styles, about 32 KB.

### Classes

- Every block sits in a `.ca`. A screenshot's `figure.ca-screenshot` is inside it, and a compare is `.ca.ca-compare`, plus `.ca-slider` with `mode="slider"`.
- A screenshot holds `.ca-heading` with its title in `.ca-label`, then `.ca-stage` with the image in `.ca-frame`, and a `figcaption` with the notes in `ol.ca-notes`. It has `.ca-left`, `.ca-right`, `.ca-top`, or `.ca-bottom` when it has side notes there.
- A mark is a `.ca-mark` with its shape as a class, such as `.ca-box` or `.ca-circle`, and its number in `.ca-stamp`. A side note is a `.ca-callout` with its arrow in `.ca-arrow`. A mark, its arrow, and its note share a `data-n`.
- The Copy button is `.ca-copy`. A slider's divider is `.ca-handle`, with its knob in `.ca-grip`.

### Example

Blue marks in the page's own font:

```css
.ca {
  --ca-color: #0070f3;
  --ca-solid: #0070f3;
  --ca-ink: #fff;
  --ca-note-font: inherit;
}
```
