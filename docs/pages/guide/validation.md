---
title: Validation
description: Every plugin reports problems to meta.issues, one sentence each that names the block and the fix.
keywords: errors, issues, warnings, meta.issues, problems, diagnostics, debugging
tagline: Check a document before you publish it. Each problem is one sentence that names the block and says how to fix it, and rendering never throws.
---

## meta.issues

The plugins check every block while parsing and add their problems to `meta.issues`. Several plugins run on one document, so each one adds to the list and never replaces it. Parse with the plugins you render with, and reject the document if the list isn't empty:

```ts
import { parseMarkdown } from "comark";
import annotate from "comark-annotate";
import carousel from "comark-carousel";
import embed from "comark-embed";
import include from "comark-include";

const { meta } = await parseMarkdown(markdown, {
  plugins: [include(), annotate(), carousel(), embed()],
});
if (meta.issues.length) throw new Error(meta.issues.join("\n"));
```

Rendering never throws. A block with a problem renders as well as it can, and the issue says what was dropped or guessed.

## What they report

Each issue names its block the way a reader would find it, by `src`, title, or position. Then it says what to change.

```txt
screenshot "after.png", annotation 2: the box runs past the image edge. Keep x + w and y + h within 100.
carousel 2 ("Pigeon census") drops the paragraph "Count the roof twice" because it sits outside every :::slide; move it into a :::slide.
include "./ducks.md": file not found. It resolved to "guide/ducks.md" under the root; check the path or base.
```

| Plugin | Reports |
| --- | --- |
| [charts](/charts/#validation) | Invalid chart tables and marks |
| [annotate](/annotate/#validation) | Missing or unknown props, marks outside the image, side notes that would overlap, compares whose viewports differ, and diffs that are too long, mix files, or change nothing |
| [carousel](/carousel/#issues) | Content outside every `:::slide`, empty carousels, bad `columns`, stray slides, and props bound to render-time data |
| [embed](/embed/) | Missing or non-https links, links it can't read, cards without a `title`, and a bad `start` |
| [tabs](/tabs/#issues) | Tabs without a label or with the same label, content outside every tab, anything but code blocks in a code group, empty blocks, and stray `:::tabs-item` |
| [include](/include/#issues) | Missing files, paths that leave the root, cycles, and bad `lines` or `region` |

code and zoom have nothing to report, because every code block gets its buttons and anything can zoom. github reports only a `repo` that isn't `owner/name`. A quote that isn't a callout stays a quote, and github drops HTML that GitHub doesn't allow, the way GitHub does.

Each plugin also records the rule of every issue in `meta.issueRules`, keyed by the sentence. [Doctor](/doctor/) has a page per rule, with Markdown that triggers it and the same Markdown fixed:

```ts
meta.issueRules['screenshot "after.png", annotation 2: the box runs past the image edge. Keep x + w and y + h within 100.'];
// "comark/annotate/box-outside-image"
```

## Line numbers

`meta.issues` can't say where a problem is, because Comark gives nodes no source positions. [comark-linter](/lint/) finds the line of each issue. It also checks what Comark forgives silently: blocks never closed, misspelled components, broken links and anchors, links to localhost, unsafe URLs, repeated ids, images without alt text, and links without text.

It reports each issue under its rule, and Vite Doctor shows the rule's code. Run it in CI and in [Vite Doctor](/lint/getting-started/#vite-doctor):

```sh
pnpm lint-comark "docs/**/*.md"
```

comark-annotate has its own CLI. It checks only annotate, carousel, and zoom, without line numbers, and it renders a file to a standalone page you can open and screenshot. Use [`comark-annotate render`](/guide/agents/#check-the-result) to look at the marks, and lint-comark for everything else.
