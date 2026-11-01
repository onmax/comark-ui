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

remark-to-comark moves a Markdown project from remark to Comark. It changes only what remark would still render the same, and reports the rest with a fix.

## Features

- `check` lists every remark setup it finds, with a [fix](/remark-to-comark/diagnostics/) for each problem.
- `rewrite` swaps a unified chain for Comark's `renderHtml` when every plugin carries over.
- `content` escapes the Markdown Comark would read differently.
- It finds setups in unified, react-markdown, Vue, Svelte, Astro, Next.js, Docusaurus, Gatsby, and Nuxt Content.
- It also runs in [Vite Doctor](/remark-to-comark/vite-doctor/).

Tested on [100 projects](/remark-to-comark/testing/).

## Why Comark

Comark renders components written in plain-text Markdown to Vue, React, Svelte, Angular, HTML, and the terminal, and it renders a half-streamed reply without breaking. It turns Markdown into HTML 6 to 7 times faster than remark, but its browser bundle is bigger. [Speed and size](/remark-to-comark/testing/#speed-and-size) has the numbers.

## Usage

Try the check without installing anything. It only reads the project:

```sh
pnpm dlx remark-to-comark check .
```

The whole migration is four commands. [Getting started](/remark-to-comark/getting-started/) explains each one.

```sh
pnpm remark-to-comark check .
pnpm remark-to-comark content "**/*.{md,mdx}" --write
pnpm remark-to-comark rewrite . --write
pnpm remark-to-comark check .
```

## Limits

- It leaves MDX alone, because JSX and expressions need a JavaScript runtime. Docusaurus compiles `.md` as MDX too, unless its config sets `markdown.format: "detect"`.
- It reports framework configs but doesn't rewrite them, since the framework owns the parser.
- You port your own remark plugins by hand.
- It leaves a block as written when no edit keeps remark's output the same, and reports it as RTC0303.
