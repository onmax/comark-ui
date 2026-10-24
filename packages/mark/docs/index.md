---
title: Mark
description: Highlighted text and superscripts in Markdown, rendered as native mark and sup.
keywords: highlighter, marker, ==text==, x^2^, sup
tagline: Write ==this== to highlight it and x^2^ for a superscript, with no component and no styles.
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

`==text==` renders as `<mark>` and `^text^` as `<sup>`, both native HTML that your page's styles already cover. Markdown works inside a highlight, and `{attributes}` work after one.

## Usage

### Highlight

Two equals signs on each side highlight text. Markdown works inside, and `{attributes}` work after the closing pair:

```md
The ==deploy freeze== starts at noon.

==Pineapple needs **two thirds**==.

==Do not deploy=={.warning}
```

A single `=`, as in `a = b`, stays text, and so does a `==` with nothing to close it.

### Superscript

Carets on each side make a superscript, with no spaces inside. Escape a space with a backslash:

```md
10^3^ pigeons, the 1^st^ count, and E = mc^2^.

A ^spaced\ superscript^.
```

`^` right after `[`, as in a footnote reference `[^1]`, never starts a superscript, so the plugin works beside any footnotes plugin.

### No subscript

`~sub~` is left out on purpose. Comark's autoClose escapes a lone `~` before any plugin sees the Markdown ([comarkdown/comark#462](https://github.com/comarkdown/comark/issues/462)), and GitHub reads `~text~` as strikethrough, so the same file would mean two things. Write `<sub>2</sub>` for a subscript, as in H<sub>2</sub>O.

## Examples

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

A class after a highlight styles that one alone: `==Do not deploy=={.warning}` renders `<mark class="warning">`.

### In review documents

A highlight marks the words a reviewer should read first, such as the number that changed or the condition a fix adds. Keep it to a few words per paragraph; a highlighted paragraph is a paragraph nobody skims.

### How it parses

The parser is markdown-it-mark and markdown-it-sup, ported to TypeScript, since neither ships types. Comark drops inline tokens it doesn't know and keeps their text, so the plugin renames `mark_open` and `mark_close` to the inline span Comark builds with any tag. Comark already builds `sup`.

## API

The plugin takes no options. In `comarkUi()`, `mark: false` turns it off.

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
