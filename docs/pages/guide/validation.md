---
title: Validation
description: Every plugin reports problems to meta.issues, one sentence each that names the block and the fix.
keywords: errors, issues, warnings, meta.issues, problems, diagnostics, debugging
tagline: Check a document before you publish it. Each problem is one sentence that names the block and says how to fix it, and rendering never throws.
---

## meta.issues

While parsing, the plugins add each block's problems to `meta.issues`. Parse with the plugins you render with, and reject the document if the list isn't empty:

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

Rendering never throws. A broken block renders as well as it can, and the issue says what the plugin dropped or guessed.

## What they report

Each issue names its block by `src`, title, or position, then says what to change.

```txt
screenshot "after.png", annotation 2: the box runs past the image edge. Keep x + w and y + h within 100.
carousel 2 ("Pigeon census") drops the paragraph "Count the roof twice" because it sits outside every :::slide; move it into a :::slide.
include "./ducks.md": file not found. It resolved to "guide/ducks.md" under the root; check the path or base.
```

| Plugin | Reports |
| --- | --- |
| [charts](/charts/#issues) | Invalid chart tables and marks |
| [annotate](/annotate/#issues) | Missing or unknown props, marks outside the image, overlapping side notes, compares whose viewports differ, and diffs that are too long, mix files, or change nothing |
| [carousel](/carousel/#issues) | Content outside every `:::slide`, empty carousels, bad `columns`, stray slides, and props bound to render-time data |
| [embed](/embed/) | Missing, non-https, or unreadable links, cards without a `title`, and a bad `start` |
| [tabs](/tabs/#issues) | Missing or repeated labels, content outside every tab, anything but code blocks in a code group, empty blocks, and stray `:::tabs-item` |
| [include](/include/#issues) | Missing files, paths that leave the root, cycles, and bad `lines` or `region` |

code and zoom report nothing, since every code block gets its buttons and anything can zoom. github reports only a `repo` that isn't `owner/name`. It leaves a quote that isn't a callout as a quote, and drops HTML that GitHub doesn't allow.

`meta.issueRules` maps each issue's sentence to its rule. [Doctor](/doctor/) has a page per rule, with Markdown that triggers it and the fix:

```ts
meta.issueRules['screenshot "after.png", annotation 2: the box runs past the image edge. Keep x + w and y + h within 100.'];
// "comark/annotate/box-outside-image"
```

## Line numbers

Comark gives nodes no source positions, so `meta.issues` can't say where a problem is. [comark-linter](/lint/) finds each issue's line. It also catches what Comark lets pass: unclosed blocks, misspelled components, broken links and anchors, links to localhost, unsafe URLs, repeated ids, images without alt text, and links without text.

It reports each issue under its rule. Run it in CI and in [Vite Doctor](/lint/vite-doctor/), which shows the rule's code:

```sh
pnpm comark-lint "docs/**/*.md"
```

comark-annotate's own CLI checks only annotate, carousel, and zoom, without line numbers. It also renders a file to a standalone page you can screenshot. Use [`comark-annotate render`](/guide/agents/#check-the-result) to look at the marks, and comark-lint for the rest.
