---
title: comark-linter
description: Finds unclosed blocks, unknown components, broken anchors, and plugin issues in Comark documents.
tagline: Check Comark documents before they publish, from a script, the command line, or Vite Doctor. Every message names the block and says how to fix it.
install: pnpm add -D comark-linter
group: Authoring tools
icon: list-checks
blurb: Catches what Comark forgives
---

Comark forgives a lot: it closes a `::` block you forgot to close, reads a missing `}` as the end of the line, and renders a misspelled component as an empty element. lint-comark reports each of these, with its line, so whoever wrote the document, often an agent, can fix it.

```txt
docs/pigeons-vs-deploys.md:8:1 comark/unclosed-block `::compare` opened on line 8 is never closed. Add a line with `::` after its last child.
docs/pigeons-vs-deploys.md:12:1 comark/unknown-component `::screnshot` on line 12 is not a known component. Did you mean `screenshot`? Known: `annotation`, `compare`, `diff`, `screenshot`.
```

## Rules

### `comark/unclosed-block` {#comark0001}

A `::` block needs a closing line with the same number of colons. Comark closes it at the end of the document, or at the next closer of an outer block, so everything after it moves inside. Code and HTML blocks are skipped, since Comark reads them as text.

### `comark/unknown-component` {#comark0002}

A block or inline component that isn't in your components or HTML, with the closest known name when one is near. Comark renders an unknown component as an empty element.

### `comark/malformed-attributes` {#comark0003}

A `{` that opens attributes and is never closed, after a component, a `[span]`, a link, or an image. Comark reads the rest of the line as attributes. Also a key set twice in one `{…}`; Comark keeps only the last.

### `comark/broken-anchor` {#comark0004}

A `#fragment` link that matches no heading id or `{#id}` in the same document. The message lists the ids it has. Links to other documents and external links aren't checked.

### `comark/invalid-frontmatter` {#comark0005}

Frontmatter that isn't valid YAML, on the line of the YAML error. Comark throws on it; lint-comark reports it and still checks the rest of the document.

### `comark/plugin-issue` {#comark0006}

Every problem a plugin adds to `meta.issues`, such as a screenshot without `alt` from comark-annotate. It's placed on the block the message names when the source shows where that is, and on line 1 otherwise.

### `comark/unsafe-url` {#comark0007}

A `javascript:`, `vbscript:`, or `data:` URL in an `href` or `src`. `data:` images are fine.

## Positions

Comark gives parsed nodes no source positions. lint-comark takes block components' lines from the parser's tokens and finds everything else by searching the source, so a component inside a paragraph gets its line and the first matching column, a URL is matched where it starts an attribute or link rather than in prose, and a repeated value is matched in order. Broken-anchor links are indexed in one pass, so generated documents with thousands of links keep their source locations without rescanning the whole document for each one.
