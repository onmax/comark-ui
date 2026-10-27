# comark-reading-time

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-reading-time&icon=npm)](https://npmx.dev/package/comark-reading-time)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-reading-time&period=month&icon=npm)](https://npmx.dev/package/comark-reading-time)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-reading-time)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/reading-time/)

A document's word count and reading time, written to `meta.readingTime` while parsing. A [Comark](https://comark.dev) plugin for any renderer.

```sh
pnpm add comark comark-reading-time
```

```ts
import { parseMarkdown } from "comark";
import readingTime from "comark-reading-time";

const { meta } = await parseMarkdown(markdown, { plugins: [readingTime({ wordsPerMinute: 200 })] });
meta.readingTime; // { words: 1240, minutes: 7 }
```

Code blocks, frontmatter, and comments are left out; inline code counts. Chinese, Japanese, and Korean are counted by character, since they're written without spaces between words. `minutes` is rounded up, and 0 only for a document with no words. `countWords(text)` counts any string the same way.

It draws nothing and has no components: show the numbers in your layout.
