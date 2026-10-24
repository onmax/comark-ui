---
title: Reading time
description: How long a document takes to read, counted while parsing.
keywords: read time, minutes to read, word count, reading speed, estimated time
tagline: Get a document's word count and reading time in its meta, with code blocks left out and Chinese, Japanese, and Korean counted by character.
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

The plugin draws nothing: it writes the numbers to `meta`, and your layout shows them where it wants, such as under the title or in a list of posts.

It counts the text a reader reads. It leaves out code blocks, since a reader skims them, and frontmatter and comments. Inline code counts. Chinese, Japanese, and Korean are written without spaces between words, so each of their characters counts as a word.

## Usage

Read `meta.readingTime` from the parsed document:

```ts
import { parseMarkdown } from "comark";
import comarkUi from "comark-ui/html";

const { meta } = await parseMarkdown(markdown, { plugins: comarkUi().plugins });
const label = `${meta.readingTime.minutes} min read`;
```

### What it writes

| Field | What it is |
| --- | --- |
| `meta.readingTime.words` | The words in the text outside code blocks, frontmatter, and comments. Each CJK character counts as one. |
| `meta.readingTime.minutes` | `words` over `wordsPerMinute`, rounded up, so any text takes at least a minute. 0 for a document with no words. |

## Examples

### Show it in a layout

The plugin only counts, so the layout decides where the time goes. With `@comark/html`, parse once, read the meta, and render the same document:

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

A page of CJK text counts characters, and most readers get through more than 200 of those a minute. A site mostly in Chinese or Japanese may want a higher `wordsPerMinute`.

## API

The options go under `readingTime` in `comarkUi()`, or to `readingTime()` when you use the plugin alone.

| Option | Default | What it does |
| --- | --- | --- |
| `wordsPerMinute` | `200` | How many words a reader reads a minute. |

`countWords(text)` is exported too, to count a string the same way, such as an excerpt.

### Package

comark-ui brings `comark-reading-time` and registers it. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-reading-time
```

```ts
import { parseMarkdown } from "comark";
import readingTime from "comark-reading-time";

const { meta } = await parseMarkdown(markdown, { plugins: [readingTime()] });
const label = `${meta.readingTime.minutes} min read`;
```

It works with any renderer, since it changes nothing a renderer draws. With `createHtmlRenderer`, parse first with `parseMarkdown`, read the meta, and render the document with `renderHtmlFromDocument`.
