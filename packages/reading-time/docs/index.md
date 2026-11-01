---
title: Reading time
description: How long a document takes to read, counted while parsing.
keywords: read time, minutes to read, word count, reading speed, estimated time
tagline: A count of the words in a document and the minutes it takes to read, written to its meta while parsing.
group: Authoring tools
icon: clock
blurb: Word count and reading time
---

```ts
import { parseMarkdown } from "comark";
import readingTime from "comark-reading-time";

const { meta } = await parseMarkdown(markdown, { plugins: [readingTime()] });
meta.readingTime; // { words: 1240, minutes: 7 }
```

## Features

- The plugin draws nothing. It writes the numbers to `meta` for your layout to show, such as under the title or in a list of posts.
- It leaves out code blocks, since readers skim them.
- Frontmatter, comments, and raw `script`, `style`, and `textarea` elements don't count. Inline code does.
- Each Chinese, Japanese, and Korean character counts as a word, since those languages don't put spaces between words.
- It works with any renderer, since it changes nothing a renderer draws.

## Usage

Read `meta.readingTime` from the parsed document:

```ts
import { parseMarkdown } from "comark";
import comarkUi from "comark-ui/html";

const { meta } = await parseMarkdown(markdown, { plugins: comarkUi().plugins });
const label = `${meta.readingTime.minutes} min read`;
```

### Speed

Use the `wordsPerMinute` option to set the reading speed. It defaults to 200.

```ts
const { meta } = await parseMarkdown(markdown, { plugins: [readingTime({ wordsPerMinute: 230 })] });
```

> [!NOTE]
> A `wordsPerMinute` of 0 or less counts at 200.

## Examples

### Show it in a layout

With `@comark/html`, parse once, read the meta, and render the same document:

```ts
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import readingTime from "comark-reading-time";

const document = await parseMarkdown(markdown, { plugins: [readingTime()] });
const body = await renderHtmlFromDocument(document);
const html = `<p class="byline">${document.meta.readingTime.minutes} min read</p>${body}`;
```

With `@comark/vue` or `@comark/react`, read `meta.readingTime` from the parsed document you pass to `MarkdownDocument`.

### Choose a speed

200 words a minute is a cautious pace for technical prose. For light reading, 230 to 250 is closer to how adults read. For review documents dense with code and names, keep the default or go lower.

CJK text counts characters, and most readers get through more than 200 a minute, so a site mostly in Chinese or Japanese may want a higher `wordsPerMinute`.

## API

### Options

Pass options under `readingTime` in `comarkUi()`, or to `readingTime()` alone.

| Option | Default | Description |
| --- | --- | --- |
| `wordsPerMinute` | `200` | How many words a reader reads a minute. 0 or less counts at 200. |

### Meta

| Field | Description |
| --- | --- |
| `meta.readingTime.words` | The words in the text outside code blocks, frontmatter, and comments. Each CJK character counts as one. |
| `meta.readingTime.minutes` | `words` over `wordsPerMinute`, rounded up, so any text takes at least a minute. 0 for a document with no words. |

### Functions

| Function | Returns | Description |
| --- | --- | --- |
| `countWords(text)` | `number` | Counts a string's words the same way, such as an excerpt's. |

### Package

comark-ui installs and registers `comark-reading-time`. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-reading-time
```

```ts
import { parseMarkdown } from "comark";
import readingTime from "comark-reading-time";

const { meta } = await parseMarkdown(markdown, { plugins: [readingTime()] });
const label = `${meta.readingTime.minutes} min read`;
```

With `createHtmlRenderer`, parse first with `parseMarkdown`, read the meta, and render the document with `renderHtmlFromDocument`.
