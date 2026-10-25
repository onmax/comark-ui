---
title: CJK
description: Bold and italics that work next to Chinese, Japanese, and Korean punctuation.
keywords: Chinese, Japanese, Korean, East Asian, emphasis, bold, italic, punctuation, CommonMark
tagline: A rule for bold, italics, and strikethrough that end next to Chinese, Japanese, and Korean punctuation.
group: Markdown syntax
icon: languages
blurb: Emphasis in Chinese, Japanese, and Korean
credits: 'Runs <a href="https://github.com/tats-u/markdown-cjk-friendly">markdown-it-cjk-friendly</a> by tats-u.'
---

::examples
:::example{label="Japanese"}
```md
**この文は太字。**次の文は普通です。

会議は*「金曜日」*に移りました。

~~鳩の数を数える。~~もう数えません。
```
:::

:::example{label="Chinese and Korean"}
```md
**这句话是粗体。**下一句不是。

**이 문장은 굵게.**다음 문장은 아닙니다.
```
:::
::

## Features

- `**bold**`, `*italics*`, and `~~strikethrough~~` close right after `。` or `」`, with no space before the next word.
- The syntax stays CommonMark's. Only the rule for where a delimiter opens and closes changes.
- English and other text parses as before.
- It runs [markdown-it-cjk-friendly](https://github.com/tats-u/markdown-cjk-friendly) by tats-u unchanged.
- No components and no styles, so it works in any renderer.

## Usage

Write emphasis as you would in English. Without the plugin, every line in the demos above shows its asterisks.

```md
**この文は太字。**次の文は普通です。
```

### Bold

Use `**` to bold a sentence that ends in `。` or `.` right before the next one.

::example
```md
**この文は太字。**次の文
```
::

### Italics

Use `*` to set text in italics next to `「` and `」`.

::example
```md
*「強調」*です
```
::

### Strikethrough

Use `~~` to strike out a sentence that ends in punctuation.

::example
```md
~~削除。~~次
```
::

> [!NOTE]
> `_` and `__` still don't open or close in the middle of a word. Write `**` and `*` in these languages.

## Examples

### Why CommonMark shows the asterisks

CommonMark decides whether `**` opens or closes bold by the characters around it. It lets `**` close bold only when it is right-flanking. Roughly, that means it comes after text and not before more of it, unless punctuation sits on its left and a space or punctuation on its right.

`**太字。**次` breaks that. `。` is punctuation and `次` is a letter, so the closing `**` is left as text and the whole line shows its asterisks.

English puts a space after a full stop, so it never hits this. Chinese, Japanese, and Korean put no space after `。`, `、`, `」`, or `.`. With the plugin, a delimiter next to a character from those scripts may open or close as if a space were there:

::example
```md
**이 문장은 굵게.**다음 문장
```
::

### Text in other languages

Text with no Chinese, Japanese, or Korean on either side of a delimiter parses as CommonMark says. So `**foo.**bar` still shows its asterisks.

```md
**foo.**bar
```

### Streaming

Comark closes the bold a stream leaves open before parsing, so `**太字。` shows as bold while the rest arrives. Write `**` rather than `__` there too: an unmatched `__` is closed at the end of the line, not where you meant.

### Text that also renders on GitHub

GitHub's Markdown follows CommonMark here, so a README in Japanese still shows the asterisks there. For text that has to read the same on GitHub, move the closing `**` before the punctuation:

```md
**太字**。
```

### Other Markdown tools

The plugin's [upstream repository](https://github.com/tats-u/markdown-cjk-friendly) holds the specification, a proposal for CommonMark, and versions of the same fix for remark and micromark. A site that renders some pages with another Markdown tool can read them the same way.

## API

### Options

The plugin takes no options. `cjk: false` in `comarkUi()` turns it off.

### Package

comark-ui brings `comark-cjk` and registers it. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-cjk
```

```ts
import { parseMarkdown } from "comark";
import cjk from "comark-cjk";

const document = await parseMarkdown(markdown, {
  plugins: [cjk()],
});
```

It has no components and no styles, because it only changes where `*`, `_`, and `~~` start and end. It works with `registerDefaultPlugins: false` and in streaming parses.
