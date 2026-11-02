---
title: How it was tested
description: The 100 projects marked-to-comark ran on, what it checks on each, and what still differs.
---

marked-to-comark was run on the 100 most-starred GitHub repositories that declare `marked` in a package.json, among them Vue, Open WebUI, Angular, MUI, Uptime Kuma, Mermaid, and Grafana. Each run works on a copy of the project at a pinned commit, with up to 300 Markdown files sampled from it.

marked renders each document at the version the project declares, from 0.3 to 18, with the options the scan finds and the extensions the test can load. Comark parses the same document with `comarkOptions()` set the way `rewrite` would set it, and its parse tree, which every Comark renderer draws from, is written out as HTML. Both are parsed as HTML and compared after whitespace a browser collapses is normalized. The test also renders through `@comark/html` and reports that apart, since that renderer has formatting bugs of its own.

On every project, the run checks that:

- `check`, `rewrite`, and `content` never throw.
- Rewritten code still parses and keeps its imports consistent, and a second run changes nothing.
- marked, at the project's version, renders every escaped file byte for byte as before.
- Comark's HTML ends up no further from marked's than it was before the escapes.
- Each rewritten call, rebuilt from its setup, renders the project's documents like its replacement.

## What it compares

Most marked projects render strings at runtime, such as chat replies, comments, or CMS fields, which the test can't see. It compares the Markdown in the repository instead. Where the project's marked code names a folder, such as `posts/`, those files are reported apart; the rest is a sample of the repository's Markdown, which marked may not render at all.

## Results

Of 13,569 sampled documents, Comark's parse tree matches marked's HTML for 96.6% after migration, once whitespace is normalized; 78.7% matched before the content edits. On the 14 projects whose whole setup the test reproduces, it's 98.2%. Through `@comark/html` itself, 88.3% match (93.7% on those 14 projects): most of the gap is that renderer's own output, such as the indentation it adds to code inside lists. Most projects are approximate: 63 have more than one marked setup, 25 a custom renderer, and 22 a setup the scan doesn't find in the code it sampled. No document broke the checks above.

`content` changed 2,688 documents with 105,679 edits and left 281 blocks as written, each because no edit kept marked's output the same.

`rewrite` replaced 14 of the 252 marked calls it found. The rest stay for a reason the check names: a function that isn't async (Comark renders asynchronously), the project's own renderer or extensions, code that works on marked's tokens, or a shared `marked` that another file configures. Each of the 14 was run against its setup on that project's documents, and matches at 98.7 to 100%.

## What still differs

460 documents still differ. Most of it follows from how a browser reads marked's HTML, or from marked's own reading of Markdown, which Comark doesn't copy. The table sorts 444 of them by cause: compared again with each project's marked version but without its other options, 16 matched. A document with several causes counts under each.

| Cause | Documents |
| --- | --: |
| Components and custom elements on MDX, Vue, and Docusaurus pages, unclosed or nested | 147 |
| HTML a browser repairs its own way, such as an unclosed `<p>` | 110 |
| List structure marked reads its own way, such as looseness | 52 |
| marked 0.3, which reads lists and escapes before CommonMark | 47 |
| Links: where an autolink ends, URLs in link text, hosts written in Unicode | 44 |
| Emphasis delimiters marked doesn't match as CommonMark does | 36 |
| Code spans marked opens or closes elsewhere | 27 |
| A space marked drops before inline HTML in a list item | 13 |
| A raw-text tag in prose, such as `<script>`, which hides what follows in a browser | 9 |
| Other, each in a few documents | 101 |

`comarkOptions()` works around the Comark bugs the test found, such as inline HTML that loses its text inside bold or a heading, an indented HTML block read as a paragraph, and image alt text that keeps its Markdown. It also copies what each marked version did, such as heading ids before v7, tabs before v14, and marked 0.3's tables.
