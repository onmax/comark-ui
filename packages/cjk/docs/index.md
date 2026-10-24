---
title: CJK
description: Bold and italics that work next to Chinese, Japanese, and Korean punctuation.
keywords: Chinese, Japanese, Korean, East Asian, emphasis, bold, italic, punctuation, CommonMark
tagline: Bold and italics that end in 。 or 」 right before the next word, where CommonMark leaves the asterisks on the page.
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

Without the plugin, every line above shows its asterisks. CommonMark decides whether `**` opens or closes bold by the characters around it, and a closing `**` between `。` and the next word counts as neither, because Chinese, Japanese, and Korean put no space there. The plugin relaxes that rule next to those scripts only, so English and other text parses as before.

## Usage

The syntax is CommonMark's: `**bold**`, `*italics*`, and `~~strikethrough~~`. Only the rule for where they start and end changes.

### The rule it fixes

CommonMark lets `**` close bold only when it is right-flanking. Roughly, that means it comes after text and not before more of it, unless punctuation sits on its left and a space or punctuation on its right. `**太字。**次` breaks that: `。` is punctuation and `次` is a letter, so the closing `**` is left as text and the whole line shows its asterisks.

English puts a space after a full stop, so it never hits this. Chinese, Japanese, and Korean put no space after `。`, `、`, `」`, or `.`. With the plugin, a delimiter next to a character from those scripts may open or close as if a space were there:

```md
**この文は太字。**次の文
*「強調」*です
~~削除。~~次
**이 문장은 굵게.**다음 문장
```

### What stays the same

Text with no Chinese, Japanese, or Korean on either side of a delimiter parses as CommonMark says, so `**foo.**bar` still shows its asterisks. `_` and `__` still don't open or close in the middle of a word, so write `**` and `*` in these languages.

## Examples

### Where the rule comes from

The plugin runs [markdown-it-cjk-friendly](https://github.com/tats-u/markdown-cjk-friendly) by tats-u unchanged. Its repository holds the specification, a proposal for CommonMark, and versions of the same fix for remark and micromark, so a site that renders some pages with another Markdown tool can read them the same way.

### Streaming

Comark closes the bold a stream leaves open before parsing, so `**太字。` shows as bold while the rest arrives. Write `**` rather than `__` there too: an unmatched `__` is closed at the end of the line, not where you meant.

### On GitHub

GitHub's Markdown follows CommonMark here, so a README in Japanese still shows the asterisks there. Move the closing `**` before the punctuation, `**太字**。`, for text that has to read the same on GitHub.

## API

The plugin takes no options. In `comarkUi()`, `cjk: false` turns it off.

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
