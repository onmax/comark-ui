# comark-reading-time

[![npm version](https://npmx.dev/api/registry/badge/version/comark-reading-time)](https://npmx.dev/package/comark-reading-time)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-reading-time)](https://npmx.dev/package/comark-reading-time)
[![install size](https://npmx.dev/api/registry/badge/size/comark-reading-time)](https://npmx.dev/package/comark-reading-time)
[![license](https://npmx.dev/api/registry/badge/license/comark-reading-time)](https://npmx.dev/package/comark-reading-time)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/reading-time/)

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
