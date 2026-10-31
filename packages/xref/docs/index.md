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
- `:ref{#id}` becomes a link that reads "Figure 1" or "Table 1", and stays right when figures move.
- Figures and tables are numbered separately, in the order they appear, and a reference can come before what it points at.
- A reference to a label that doesn't exist is an issue, not a broken link.
- It needs no components or styles. The output is plain `figure`, `figcaption`, `caption`, and `a` elements.

## Usage

Give an image an id that starts with `fig-`, and point at it with `:ref`.

```md
As :ref{#fig-login} shows, the button moved.

![The login page](login.png){#fig-login}
```

A label is `fig-` or `tbl-` followed by letters, digits, `_`, or `-`.

### Figures

Use a `fig-` id on an image alone in its paragraph to make it a numbered `figure`. Its caption reads "Figure 1: The login page", from its alt text. An image with no alt text reads "Figure 1".

```md
![The login page](login.png){#fig-login}
```

A `::figure{#fig-...}` block of your own is numbered as it is, and so is any other element with a `fig-` id, such as a comark-annotate `::screenshot`.

> [!NOTE]
> A labeled image that shares its paragraph with text isn't a figure, and is reported. Put it on a line of its own.

### Tables

Use a `tbl-` id on `::table` to number a table. Use its `caption` prop to set the text after the number, "Table 1: Homing times by bird".

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

Use `:ref{#id}` to link to a label. The link reads "Figure 1" or "Table 1". It can point at a label above or below it.

```md
As :ref{#fig-login} shows, the button moved.
```

> [!NOTE]
> A reference to a label that doesn't exist renders as `[id]` and is reported. Text inside a `:ref` is dropped, since the reference reads as its label's number.

## Examples

### Long review documents

A review with several screenshots reads better when the text says which one it means. Label each screenshot and refer to it by label, and the numbers stay right when you add, remove, or reorder them:

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

Pandoc's `@fig-login` isn't read, since `@name` is a mention in comark-chips and comark-github. Write `:ref{#fig-login}` instead.

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
| `caption` | — | The text after the number in the table's caption. |

#### Ref

| Prop | Default | Description |
| --- | --- | --- |
| `#id` | — | The label the link points at. Required. |

### Options

The options go under `xref` in `comarkUi()`, or to `xref()` when you use the plugin alone.

| Option | Default | Description |
| --- | --- | --- |
| `figure` | `"Figure"` | The word before a figure's number. |
| `table` | `"Table"` | The word before a table's number. |

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A reference with no id.
- A reference to a label that doesn't exist. It renders as `[id]`.
- A label used twice.
- A labeled image that shares its paragraph with text, so it isn't a figure.
- Text inside a `:ref`, which it drops.

Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/).

### Package

comark-ui brings `comark-xref` and registers it. To use it alone, install it and register the plugin with any renderer:

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

These classes are there for your own rules:

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
