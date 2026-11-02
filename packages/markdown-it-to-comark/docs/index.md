---
title: markdown-it-to-comark
description: Moves a project from markdown-it to Comark, with a finding for everything it can't do itself.
keywords: markdown-it, migration, migrate, codemod, VitePress, VuePress, Eleventy, Slidev, plugins, Vite Doctor, diagnostics
tagline: A codemod and checker that moves a markdown-it project to Comark and says what it leaves to you.
install: pnpm add -D markdown-it-to-comark
group: Migration from markdown-it
label: Overview
icon: arrow-right-left
blurb: Leave markdown-it for Comark
---

markdown-it-to-comark moves a project from markdown-it to Comark. It changes only what markdown-it would still render the same, and reports the rest with a fix.

## Features

- `check` lists every markdown-it setup it finds, with a [fix](/markdown-it-to-comark/diagnostics/) for each problem.
- `rewrite` swaps a markdown-it instance for Comark's `renderHtml` when every option and plugin carries over.
- `content` escapes the Markdown Comark would read differently.
- `markdownItPlugin()` runs a markdown-it plugin on Comark, renderer rules included, so plugins keep their output.
- It finds setups in your own code and in VitePress, VuePress, Vite Markdown plugins, Eleventy, and VS Code extensions.
- It also runs in [Vite Doctor](/markdown-it-to-comark/vite-doctor/).

Tested on [100 projects](/markdown-it-to-comark/testing/).

## Why Comark

Comark parses with markdown-exit, a port of markdown-it, so the Markdown reads the same. It renders components written in plain-text Markdown to Vue, React, Svelte, Angular, HTML, and the terminal, and it renders a half-streamed reply without breaking. markdown-it stays smaller and renders synchronously.

## Usage

Try the check without installing anything. It only reads the project:

```sh
pnpm dlx markdown-it-to-comark check .
```

The whole migration is four commands. [Getting started](/markdown-it-to-comark/getting-started/) explains each one.

```sh
pnpm markdown-it-to-comark check .
pnpm markdown-it-to-comark content "**/*.md" --write
pnpm markdown-it-to-comark rewrite . --write
pnpm markdown-it-to-comark check .
```

## Limits

- Comark renders asynchronously. `md.render()` returns a string, `renderHtml()` a promise, so `rewrite` only replaces an instance whose every `render` call is inside an async function.
- It reports framework setups but doesn't rewrite them, since the framework owns the instance.
- Plugins outside the tested list run through `markdownItPlugin()`, but nobody has compared their output; check a few pages.
- It leaves a block as written when no edit keeps markdown-it's output the same, and reports it as MIC0303.
