---
title: Mark
description: Highlighted text and superscripts in Markdown, rendered as native mark and sup with styles that match your theme.
keywords: highlighter, marker, ==text==, x^2^, sup
tagline: Highlighted text and superscripts, written as ==this== and x^2^.
group: Markdown syntax
icon: highlighter
blurb: Highlights and superscripts
credits: 'Ported from <a href="https://github.com/markdown-it/markdown-it-mark">markdown-it-mark</a> and <a href="https://github.com/markdown-it/markdown-it-sup">markdown-it-sup</a>.'
---

::examples
:::example{label="Highlight"}
```md
The deploy waits while ==more than 12 pigeons== sit on the roof.

Pineapple pizza needs ==two thirds of the **Friday** vote==.
```
:::

:::example{label="Superscript"}
```md
The office roof holds about 10^3^ pigeons, and the 1^st^ count of the day is at 9:00.
```
:::
::

## Features

- `==text==` renders as `<mark>` and `^text^` as `<sup>`, native HTML that every renderer outputs.
- Markdown works inside a highlight, and `{attributes}` work after one.
- `[^1]` stays a footnote reference, so the plugin works beside any footnotes plugin.
- The components tint highlights amber like comark-critic's, on light and dark pages, and keep a superscript from opening a gap in its line.

## Usage

Write two equals signs on each side of the text to highlight.

::example
```md
The ==deploy freeze== starts at noon.
```
::

### Markdown inside

Use Markdown inside a highlight to format its text.

::example
```md
==Pineapple needs **two thirds**==.
```
::

### Attributes

Use `{attributes}` right after the closing pair to set them on the `<mark>`.

::example
```md
==Do not deploy=={.warning}
```
::

A class there styles that one highlight alone: `==Do not deploy=={.warning}` renders `<mark class="cmk-mark warning">`.

> [!NOTE]
> A single `=`, as in `a = b`, stays text, and so does a `==` with nothing to close it.

### Superscript

Use carets on each side of the text for a superscript, with no spaces inside.

::example
```md
10^3^ pigeons, the 1^st^ count, and E = mc^2^.
```
::

### Spaces in a superscript

Use a backslash before a space to keep it inside a superscript.

::example
```md
A ^spaced\ superscript^.
```
::

> [!NOTE]
> `^` right after `[`, as in a footnote reference `[^1]`, never starts a superscript.

## Examples

### Subscripts

`~sub~` isn't supported. Write `<sub>2</sub>` for a subscript, as in H<sub>2</sub>O.

```md
H<sub>2</sub>O
```

### In review documents

A highlight marks the words a reviewer should read first, such as the number that changed or the condition a fix adds. Keep it to a few words per paragraph. A highlighted paragraph is a paragraph nobody skims.

### Your own highlight color

A class after a highlight sets its own color through `--cmk-mark`:

```md
==Do not deploy=={.warning}
```

```css
.warning {
  --cmk-mark: #ef4444;
}
```

## API

### Syntax

| Form | Markdown | Renders as |
| --- | --- | --- |
| Highlight | `==text==` | `<mark>text</mark>` |
| Superscript | `^text^`, with no unescaped spaces | `<sup>text</sup>` |

### Options

The plugin takes no options. `mark: false` in `comarkUi()` turns it off.

### Package

comark-ui brings `comark-mark` and registers it with its components. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-mark
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import mark, { components } from "comark-mark/html";

const render = createHtmlRenderer({ plugins: [mark()], components });
```

For Vue, React, or Svelte, import from `comark-mark/vue`, `comark-mark/react`, or `comark-mark/svelte`. The components add the styles when they mount. When you render on a server, import `comark-mark/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

Without the components, the plugin still works in any renderer: the nodes stay plain `mark` and `sup`, which the browser paints yellow and raises.

## Theme

A highlight is a `<mark class="cmk-mark">` tinted with `--cmk-mark`, amber by default, over the page's own text color, so it reads on light and dark pages. With forced colors on, it takes the system's highlight color. A superscript is a `<sup class="cmk-sup">` raised without changing its line's height. A class from `{attributes}` sits beside the component's. Highlights read one [shared token](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-radius` | Corners |

Set `--cmk-mark` on `:root` or any element around the highlights to change the color. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.
