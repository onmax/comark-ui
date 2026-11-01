---
title: remark-to-comark
description: Moves a project from remark to Comark, with a finding for everything it can't do itself.
keywords: remark, rehype, unified, migration, migrate, codemod, MDX, Docusaurus, Astro, Next.js, react-markdown, Vite Doctor, diagnostics
tagline: A codemod and checker that moves a remark project to Comark and says what it leaves to you.
install: pnpm add -D remark-to-comark
group: Migration
label: Overview
icon: arrow-right-left
blurb: Leave remark for Comark
---

remark-to-comark moves a Markdown project from remark to Comark. It finds the remark setups in the code, says what each plugin becomes, rewrites the unified chains it can, and escapes the Markdown Comark would read differently, so remark still renders every file exactly as before. What it can't do, it reports, with the fix and a link to the diagnostic.

## Features

- `check` lists every remark setup it finds, with a [fix](/remark-to-comark/diagnostics/) for each problem.
- `rewrite` swaps a unified chain for Comark's `renderHtml` when every plugin carries over.
- `content` escapes the Markdown Comark would read differently.
- It finds setups in unified, react-markdown, Vue, Svelte, Astro, Next.js, Docusaurus, Gatsby, and Nuxt Content.
- It also runs in [Vite Doctor](/remark-to-comark/vite-doctor/).

Tested on [100 projects](/remark-to-comark/testing/).

## Why Comark

Comark reads components in Markdown that stay plain text, renders one JSON parse tree in Vue, React, Svelte, Angular, HTML, and the terminal, and closes unfinished syntax so a streamed reply renders at every token. It also renders Markdown to HTML 6 to 7 times faster than remark in the measured corpora, at the price of a larger browser bundle. [Speed and size](/remark-to-comark/testing/#speed-and-size) has the numbers.

## Usage

Try the check without installing anything. It only reads the project:

```sh
pnpm dlx remark-to-comark check .
```

[Getting started](/remark-to-comark/getting-started/) walks through a migration, command by command.

```sh
pnpm remark-to-comark check .
pnpm remark-to-comark content "**/*.{md,mdx}" --write
pnpm remark-to-comark rewrite . --write
pnpm remark-to-comark check .
```

## Limits

- MDX stays as it is: JSX and expressions need a JavaScript runtime Comark doesn't have. Docusaurus compiles `.md` as MDX too, unless its config sets `markdown.format: "detect"`.
- Framework configs are reported, not rewritten: the framework owns the parser.
- A project's own remark plugins need porting by hand.
- A block no edit can migrate without changing remark's output, such as a URL after an unclosed `[`, is left as written and reported as RTC0303.
