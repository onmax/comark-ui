---
title: Cross-references
description: Numbered figures and tables, and references to them, written in Markdown.
keywords: cross reference, cross-reference, figure numbers, table numbers, numbering, references, caption, label, ref
tagline: Numbered figures and tables, and references to them that read "Figure 2" and stay right when figures move.
group: Page behavior
icon: hash
blurb: Numbered figures and references
credits: 'Labels after <a href="https://quarto.org/docs/authoring/cross-references.html">Quarto</a>''s cross-references.'
---

::examples
:::example{label="Figures"}
```md
The pigeon tracker before the redesign is in :ref{#fig-before}, and after it in :ref{#fig-after}.

![The tracker before the redesign](/before.png){#fig-before}

![The tracker after the redesign](/after.png){#fig-after}
```
:::

:::example{label="Tables"}
```md
:ref{#tbl-times} has the homing times, and :ref{#fig-route} the dashboard they come from.

::table{#tbl-times caption="Homing times by bird"}
| Bird | Distance | Time |
| --- | --- | --- |
| Rosa | 120 km | 1 h 52 min |
| Bruno | 120 km | 2 h 10 min |
::

![The race dashboard](/dashboard.png){#fig-route}
```
:::
::

## Features

- An image alone in its paragraph with a `fig-` id becomes a numbered figure, captioned from its alt text.
- A `::table` with a `tbl-` id gets a numbered caption.
- `:ref{#id}` links to either as "Figure 1" or "Table 1", and the number follows when figures move.
- Figures and tables count separately, in page order. A reference can come before its target.
- A reference to a missing label is an issue, not a broken link.
- No components or styles. The output is plain `figure`, `figcaption`, `caption`, and `a` elements.

## Usage

Give an image an id that starts with `fig-`, and point at it with `:ref`.

```md
As :ref{#fig-login} shows, the button moved.

![The login page](login.png){#fig-login}
```

A label is `fig-` or `tbl-` followed by letters, digits, `_`, or `-`.

### Figures

Use a `fig-` id on an image alone in its paragraph to make it a numbered `figure`. The caption is "Figure 1: The login page", from the alt text, or "Figure 1" without one.

```md
![The login page](login.png){#fig-login}
```

Any other element with a `fig-` id, such as your own `::figure` or a comark-annotate `::screenshot` or `::compare`, keeps its own caption and gets a number for references to read.

```md
::screenshot{src="login.png" alt="The login page" #fig-login}
::
```

> [!NOTE]
> A labeled image that shares its paragraph with text isn't a figure, and adds an issue. Put it on a line of its own.

### Tables

Use a `tbl-` id on `::table` to number it, and its `caption` prop for the text after the number, as in "Table 1: Homing times by bird".

```md
::table{#tbl-times caption="Homing times by bird"}
| Bird | Time |
| --- | --- |
| Rosa | 1 h 52 min |
::
```

> [!NOTE]
> A Markdown table can't take an id on its own, so wrap it in `::table`.

### References

Use `:ref{#id}` to link to a label above or below it. The link reads "Figure 1" or "Table 1".

```md
As :ref{#fig-login} shows, the button moved.
```

> [!NOTE]
> A reference to a missing label renders as `[id]` and adds an issue. The plugin drops text inside a `:ref`, since the link reads as the label's number.

## Examples

### Long review documents

Refer to each screenshot by its label, and the numbers stay right when you add, remove, or reorder them:

```md
The empty state in :ref{#fig-empty} replaces the spinner in :ref{#fig-loading}.

![The new empty state](empty.png){#fig-empty}

![The old spinner](loading.png){#fig-loading}
```

### Numbers in another language

Use the `figure` and `table` options to change the words before the numbers:

```ts
xref({ figure: "Abbildung", table: "Tabelle" });
```

### Coming from Pandoc

The plugin doesn't read Pandoc's `@fig-login`, since `@name` is a mention in comark-chips and comark-github. Write `:ref{#fig-login}` instead.

## API

### Props

#### Image

| Attribute | Default | Description |
| --- | --- | --- |
| `#fig-…` | — | Numbers the image as a figure, when it's alone in its paragraph. |

#### Table

| Prop | Default | Description |
| --- | --- | --- |
| `#tbl-…` | — | Numbers the table. |
| `caption` | — | The text after the number in the caption. |

#### Ref

| Prop | Default | Description |
| --- | --- | --- |
| `#id` | — | The label the link points at. Required. |

### Options

Pass options under `xref` in `comarkUi()`, or to `xref()` alone.

| Option | Default | Description |
| --- | --- | --- |
| `figure` | `"Figure"` | The word before a figure's number. |
| `table` | `"Table"` | The word before a table's number. |

### Issues

The plugin adds these to `meta.issues`, as [Validation](/guide/validation/) describes:

- A reference with no id.
- A reference to a missing label. It renders as `[id]`.
- A label used twice.
- A labeled image that shares its paragraph with text, so it isn't a figure.
- Text inside a `:ref`, which it drops.

Each names its block and the fix, and has its own rule in [Doctor](/doctor/).

### Package

comark-ui installs and registers `comark-xref`. To use it alone, install it and register the plugin with any renderer:

```sh
pnpm add comark @comark/html comark-xref
```

```ts
import { createHtmlRenderer } from "@comark/html";
import xref from "comark-xref";

const render = createHtmlRenderer({ plugins: [xref()] });
```

[Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The plugin ships no styles. Figures, captions, and links use the page's.

### Classes and attributes

Target these classes with your own rules:

| Selector | Is |
| --- | --- |
| `.cxr` | A `figure` it made from an image, and a labeled table |
| `.cxr-label` | The "Figure 1:" or "Table 1:" at the start of a caption |
| `.cxr-ref` | A reference |

### Example

A bold label:

```css
.cxr-label {
  font-weight: 600;
}
```
