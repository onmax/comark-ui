---
title: Getting started
description: Check a marked project, migrate its Markdown, rewrite its marked calls, and check again.
install: pnpm add -D marked-to-comark
---

Check the project, migrate the Markdown, rewrite the marked calls, and check again.

## Installation

```sh
pnpm add -D marked-to-comark
```

## Check the project

```sh
pnpm marked-to-comark check .
```

`check` prints one diagnostic per finding, warnings first, each linking its section in [Diagnostics](/marked-to-comark/diagnostics/). `--verbose` adds what each option and extension becomes, and `--json` prints everything for agents.

## Migrate the Markdown

```sh
pnpm marked-to-comark content "posts/**/*.md"          # what it would change
pnpm marked-to-comark content "posts/**/*.md" --write  # apply it
```

`content` reads each file with the project's own marked, at the version it declares and with its syntax extensions, such as marked-katex-extension, and escapes only text marked reads as text. Every edit is checked: marked must render the file byte for byte as before, or the edit is dropped and the line reported. Code, HTML, and frontmatter stay as written.

`check` runs it on the Markdown in folders your marked code names, such as `posts/` in `readFileSync(\`posts/${slug}.md\`)`. Point `content` at any other Markdown marked renders. Strings marked renders at runtime, such as chat replies, need nothing.

## Rewrite marked calls

```sh
pnpm marked-to-comark rewrite .          # what it would change
pnpm marked-to-comark rewrite . --write  # apply it
```

Inside an async function, `marked.parse(markdown)` becomes `await renderHtml(markdown, comarkOptions({ … }))`, with the same `gfm` and `breaks` settings and the Comark plugins its extensions become. Where marked was already async, the call becomes the promise `renderHtml` returns. A call it can't replace without changing the output stays, and the check says why. Install what the new code imports:

```sh
pnpm add comark @comark/html marked-to-comark
```

## Streaming replies

`comarkOptions()` turns Comark's auto-close off, since a file on disk is complete. For a reply that streams in, turn it back on, so unfinished Markdown renders as it will look once it's done:

```ts
import { renderHtml } from "@comark/html";
import { comarkOptions } from "marked-to-comark/setup";

const html = await renderHtml(partialReply, { ...comarkOptions(), autoClose: true });
```

## Check again

```sh
pnpm marked-to-comark check .
```

What's left is yours: custom renderers and extensions, calls it couldn't rewrite, and blocks left as written.
