---
title: comark-linter
description: Finds unclosed blocks, unknown components, broken links and anchors, local URLs, and plugin issues in Comark documents.
keywords: linter, lint, ESLint, check, validate, validation, CI, Vite Doctor, markdownlint, errors, diagnostics, broken links, CLI
tagline: A linter for Comark documents that runs from the command line, a script, or Vite Doctor.
install: pnpm add -D comark-linter
group: Linter
label: Overview
icon: list-checks
blurb: Catches what Comark forgives
---

Comark forgives a lot. It closes a `::` block you forgot to close, reads a missing `}` as the end of the line, and renders a misspelled component as an empty element. lint-comark reports each of these with its line, so whoever wrote the document, often an agent, can fix it.

## Features

- Every message names the block and says how to fix it.
- It reports each problem with its file, line, and column.
- It checks links to files, anchors in them, and, on request, external URLs.
- The command line and Vite Doctor load every comark-ui package you have installed, so they know its blocks and its issues.
- It runs from the command line, as a library, or as a [Vite Doctor](/lint/vite-doctor/) extension.
- `lint()` never throws.

## Usage

Run `lint-comark` on your documents:

```sh
pnpm lint-comark "docs/**/*.md"
```

It prints one line per problem:

```txt
docs/pigeons-vs-deploys.md:8:1 comark/unclosed-block `::compare` opened on line 8 is never closed. Add a line with `::` after its last child.
docs/pigeons-vs-deploys.md:12:1 comark/unknown-component `::screnshot` on line 12 is not a known component. Did you mean `screenshot`? Known: `annotation`, `compare`, `diff`, `screenshot`.
```

[Getting started](/lint/getting-started/) installs it and covers the config and the library.

## Rules

Every problem is reported under a rule, and [Doctor](/doctor/) has a page for each one, with Markdown that triggers it and the same Markdown fixed. The core rules check what Comark forgives:

| Rule | Reports |
| --- | --- |
| [`comark/unclosed-block`](/doctor/unclosed-block/) | A `::` block that is never closed |
| [`comark/unknown-component`](/doctor/unknown-component/) | A component that isn't in your components or HTML |
| [`comark/malformed-attributes`](/doctor/malformed-attributes/) | An unclosed `{`, or a key set twice |
| [`comark/broken-anchor`](/doctor/broken-anchor/) | A `#fragment` that matches no heading or id, in this document or the one it links |
| [`comark/invalid-frontmatter`](/doctor/invalid-frontmatter/) | Frontmatter that isn't valid YAML |
| [`comark/unsafe-url`](/doctor/unsafe-url/) | A `javascript:`, `vbscript:`, or non-image `data:` URL |
| [`comark/duplicate-id`](/doctor/duplicate-id/) | An id two elements share |
| [`comark/missing-alt`](/doctor/missing-alt/) | An image without alt text |
| [`comark/empty-link`](/doctor/empty-link/) | A link without text |
| [`comark/broken-link`](/doctor/broken-link/) | A link or image to a file that doesn't exist |
| [`comark/blocked-url`](/doctor/blocked-url/) | A localhost, private, tunnel, or deploy preview URL |
| [`comark/dead-url`](/doctor/dead-url/) | An external URL that answers 404 or 410, or whose host is gone, with `--check-urls` |

Each comark-ui package adds a rule for every kind of problem its plugin reports, such as [`comark/embed/insecure-url`](/doctor/embed/insecure-url/). A problem from a plugin of your own is [`comark/plugin-issue`](/doctor/plugin-issue/), unless the plugin names its rule in `meta.issueRules`.

## Positions

Comark gives parsed nodes no source positions. lint-comark takes block components' lines from the parser's tokens, and finds everything else by searching the source:

- A component inside a paragraph gets its line and the first matching column.
- A URL matches where it starts an attribute or link, not in prose.
- A repeated value matches in order.
- Broken-anchor links are indexed in one pass, so generated documents with thousands of links keep their source locations without rescanning the source for each one.
