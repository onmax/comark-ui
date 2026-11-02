---
title: How it was tested
description: The 100 projects markdown-it-to-comark ran on, what it checks on each, and what still differs.
---

markdown-it-to-comark was run on the 100 most-starred GitHub repositories that declare `markdown-it` in a package.json, among them freeCodeCamp, n8n, VS Code, Dify, Strapi, VitePress, and Joplin. Each run works on a copy of the project, with up to 300 Markdown files sampled from it.

markdown-it renders each file with the project's own setup: its preset, the options written as literals, and the plugins the test could load. Comark renders the migrated file with `comarkOptions()` and the same plugins through `markdownItPlugin()`. Both outputs are compared after normalizing what a reader can't see, such as whitespace between blocks, heading ids, and attribute order.

On every project, the run checks that:

- `check`, `rewrite`, and `content` never throw.
- Rewritten code still parses and keeps its imports consistent, and a second run changes nothing.
- markdown-it renders every escaped file byte for byte as before.
- Comark's output ends up no further from markdown-it's than it was before the escapes.
- Each rewritten setup, run as the rewrite wrote it, renders the project's documents like the original instance.

## Results

Of 10,749 sampled documents, RESULT_SAME render the same in Comark and in markdown-it after migration. On the 71 projects whose plugins the test could load, it's RESULT_REPRODUCED. Comark with its own defaults gets 35.6% of them right: its defaults are the opposite of markdown-it's for raw HTML and links, and it reads `{`, `[`, and `:name` as syntax.

`rewrite` replaced 16 of the 205 markdown-it setups it found. The rest stay for a reason it reports, most often a `render` call outside an async function, since Comark renders asynchronously. Each rewritten setup was run as written against the original on that project's documents, and every one renders them the same.

Most of what still differs falls into a few groups:

- HTML Comark builds differently from a browser: content inside `<template>`, whitespace between top-level HTML elements, `<![CDATA[`, and a `<p>` around HTML a tag left open.
- Projects whose own setup the test couldn't load, such as Vuetify's, whose renderer lives in a build folder, or setups that disagree about raw HTML, so blocks stay as written.
- Vue component markup (`@click`, `:prop`) on sites that compile their Markdown as Vue.
- Edge cases from parser test suites, such as nested link brackets.

Comark bugs found on the way, each with a minimal input, are worked around in `comarkOptions()` where possible: text that starts with `<!--` read as a comment, plugin tokens and renderer rules dropped by the tree builder, attributes on code blocks dropped, and HTML blocks wrapped in a paragraph.
