# Reading time

comark-reading-time counts a document's words while parsing and writes them to `meta.readingTime` as `{ words, minutes }`. It has no syntax and draws nothing. The host's layout shows the numbers, such as "7 min read" under the title.

## What it counts

- The text a reader reads. It leaves out code blocks, frontmatter, and comments, and counts inline code.
- Each Chinese, Japanese, or Korean character counts as a word, since those languages put no spaces between words.
- `minutes` is `words` over `wordsPerMinute`, rounded up, so any text takes at least a minute. It is 0 only for a document with no words.
- `countWords(text)`, also exported, counts any string the same way, such as an excerpt.

## Show it

With `@comark/html`, parse once, read the meta, and render that document:

```ts
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import comarkUi from "comark-ui/html";

const { plugins, components } = comarkUi();
const document = await parseMarkdown(markdown, { plugins });
const body = await renderHtmlFromDocument(document, { components });
const html = `<p class="byline">${document.meta.readingTime.minutes} min read</p>${body}`;
```

With `@comark/vue` or `@comark/react`, read `meta.readingTime` from the parsed document you pass to `MarkdownDocument`.

## Register

- In `comark-ui`: on in every entry. `readingTime: { wordsPerMinute: 230 }` sets the speed. The default, 200, is a cautious pace for technical prose; 230 to 250 suits light reading, and a site mostly in CJK may want more.
- Alone: `pnpm add comark comark-reading-time`, then `parseMarkdown(markdown, { plugins: [readingTime()] })` with `readingTime` from `comark-reading-time`. It has no components, so it works with any renderer.
