---
title: Mark
description: Highlighted text and superscripts in Markdown, rendered as native mark and sup.
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

- `==text==` renders as `<mark>` and `^text^` as `<sup>`, both native HTML that your page's styles already cover.
- Markdown works inside a highlight, and `{attributes}` work after one.
- `[^1]` stays a footnote reference, so the plugin works beside any footnotes plugin.
- No classes, no styles, and no components.

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

A class there styles that one highlight alone: `==Do not deploy=={.warning}` renders `<mark class="warning">`.

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

`~sub~` is left out on purpose. Comark's autoClose escapes a lone `~` before any plugin sees the Markdown ([comarkdown/comark#462](https://github.com/comarkdown/comark/issues/462)). GitHub reads `~text~` as strikethrough, so the same file would mean two things. Write `<sub>2</sub>` for a subscript, as in H<sub>2</sub>O.

```md
H<sub>2</sub>O
```

### In review documents

A highlight marks the words a reviewer should read first, such as the number that changed or the condition a fix adds. Keep it to a few words per paragraph. A highlighted paragraph is a paragraph nobody skims.

### Styling

The plugin adds no classes and no styles. Browsers draw `<mark>` with a yellow background. To match your theme:

```css
mark {
  background: color-mix(in oklab, gold 40%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 2px;
}
```

### How it parses

The parser is markdown-it-mark and markdown-it-sup, ported to TypeScript, since neither ships types. Comark drops inline tokens it doesn't know and keeps their text. So the plugin renames `mark_open` and `mark_close` to the inline span Comark builds with any tag. Comark already builds `sup`.

## API

### Syntax

| Form | Markdown | Renders as |
| --- | --- | --- |
| Highlight | `==text==` | `<mark>text</mark>` |
| Superscript | `^text^`, with no unescaped spaces | `<sup>text</sup>` |

### Options

The plugin takes no options. `mark: false` in `comarkUi()` turns it off.

### Package

comark-ui brings `comark-mark` and registers it. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-mark
```

```ts
import { parseMarkdown } from "comark";
import mark from "comark-mark";

const document = await parseMarkdown(markdown, {
  plugins: [mark()],
});
```

It has no components and no styles, because `<mark>` and `<sup>` are native HTML. It works with `registerDefaultPlugins: false` and in streaming parses. Every renderer draws the nodes as they are: `mark` and `sup`.
