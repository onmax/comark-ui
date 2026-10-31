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

remark-to-comark moves a Markdown project from remark to Comark. It finds every remark setup in the code, says what each plugin becomes, rewrites the unified chains it can, and escapes the Markdown Comark would read differently, so remark still renders every file exactly as before. What it can't do, it reports, with the fix and a link to the diagnostic.

## Features

- `check` reports everything as [diagnostics](/remark-to-comark/diagnostics/), each with its file, line, fix, and docs link, then lists what's left and the commands to run next.
- `rewrite` replaces a unified chain that renders HTML with Comark's `renderHtml`. It only does so when the code turns the result into a string and every plugin and option carries over.
- `content` escapes `{`, `[`, and `:name` that Comark would read as attributes, spans, or components, widens `~a~` to `~~a~~`, and leaves code, HTML, and MDX alone.
- It reads setups in unified chains, react-markdown props, Vue, Svelte, and Astro components, and the configs of Astro, Next.js, Docusaurus, Gatsby, Contentlayer, Velite, and Nuxt Content.
- The same findings run as a [Vite Doctor](/remark-to-comark/vite-doctor/) extension, next to comark-linter.

[How it was tested](/remark-to-comark/testing/) covers the 100 projects it ran on and what still differs.

## Usage

[Getting started](/remark-to-comark/getting-started/) walks through a migration, command by command.

```sh
pnpm remark-to-comark check .
pnpm remark-to-comark rewrite . --write
pnpm remark-to-comark content "**/*.md" --write
pnpm remark-to-comark check .
```

## Limits

- MDX stays as it is: JSX and expressions need a JavaScript runtime Comark doesn't have. Docusaurus compiles `.md` as MDX too, unless its config sets `markdown.format: "detect"`.
- Framework configs are reported, not rewritten: the framework owns the parser.
- A project's own remark plugins need porting by hand.
- A block where a URL follows an unclosed `[` is left as written when no edit keeps remark's output, and reported as RTC0303.
