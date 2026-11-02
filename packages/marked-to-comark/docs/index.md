---
title: marked-to-comark
description: Moves a project from marked to Comark, with a finding for everything it can't do itself.
keywords: marked, migration, migrate, codemod, chat, streaming, renderer, extensions, Vite Doctor, diagnostics
tagline: A codemod and checker that moves a marked project to Comark and says what it leaves to you.
install: pnpm add -D marked-to-comark
group: Migration
label: Overview
icon: arrow-right-left
blurb: Leave marked for Comark
---

marked-to-comark moves a project from marked to Comark. It changes only what marked would still render the same, and reports the rest with a fix.

## Features

- `check` lists every marked setup it finds, with a [fix](/marked-to-comark/diagnostics/) for each problem.
- `rewrite` swaps `marked.parse(md)` for Comark's `renderHtml` when every option and extension carries over.
- `content` escapes the Markdown Comark would read differently.
- It finds the shared `marked`, `new Marked()` instances, `marked.use()` and `setOptions()`, and the calls in JavaScript, TypeScript, Vue, Svelte, and Astro files.
- It reads the marked version each package declares, so heading ids, tabs, and tables from older versions carry over.
- It also runs in [Vite Doctor](/marked-to-comark/vite-doctor/).

Tested on [100 projects](/marked-to-comark/testing/).

## Why Comark

Comark parses Markdown into a document you can render to Vue, React, Svelte, Angular, HTML, or the terminal, with components written in plain-text Markdown. Many marked projects render a model's reply as it streams in; Comark completes the unfinished Markdown at every step, so a half-written `**bold` or code fence renders right away instead of as raw asterisks.

## Usage

Try the check without installing anything. It only reads the project:

```sh
pnpm dlx marked-to-comark check .
```

The whole migration is four commands. [Getting started](/marked-to-comark/getting-started/) explains each one.

```sh
pnpm marked-to-comark check .
pnpm marked-to-comark content "posts/**/*.md" --write
pnpm marked-to-comark rewrite . --write
pnpm marked-to-comark check .
```

## Limits

- Comark renders asynchronously. A call inside a function that isn't async stays, since making it async changes the function's callers.
- A custom `renderer`, `tokenizer`, `walkTokens`, or `hooks` is your code. The check names what each becomes in Comark, but you port it.
- Most marked projects render strings at runtime, such as chat replies or CMS fields. Those need no changes. `content` is for Markdown files marked reads from the repository.
- It leaves a block as written when no edit keeps marked's output the same, and reports it as MKC0303.
