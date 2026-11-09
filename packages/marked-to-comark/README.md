# marked-to-comark

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=marked-to-comark&icon=npm)](https://npmx.dev/package/marked-to-comark)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/marked-to-comark)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/marked-to-comark)

Moves a project from [marked](https://github.com/markedjs/marked) to [Comark](https://comark.dev). It finds every marked setup in the code, rewrites the calls it can, and escapes the Markdown Comark would read differently. What it can't do, it reports, with the fix and a docs link.

[Docs](https://comark-ui.onmax.me/marked-to-comark) · [Getting started](https://comark-ui.onmax.me/marked-to-comark/getting-started) · [Diagnostics](https://comark-ui.onmax.me/marked-to-comark/diagnostics) · [How it was tested](https://comark-ui.onmax.me/marked-to-comark/testing)

## Try it

Run the check without installing anything. It only reads the project:

```sh
pnpm dlx marked-to-comark check .
# or
npx marked-to-comark check .
```

```txt
[MKC0201] The marked call at src/chat.ts:7 can't be rewritten without changing what it does: it runs in a function that isn't async; `renderHtml` returns a promise, so the function and its callers would change. Make it async, then run the rewrite again.
├▶ fix: Comark renders asynchronously. Make the function async and await its callers, or keep marked here; then run `marked-to-comark rewrite` again.
╰▶ see: https://comark-ui.onmax.me/marked-to-comark/diagnostics#mkc0201
```

`check` ends with what's left and the commands to run next. `--json` prints every finding for an agent.

## Why move to Comark

marked is small and fast, and for Markdown to an HTML string it works fine. Comark is worth the move when you want what marked doesn't do:

- Streaming. Comark closes an unfinished `**bold`, code fence, or component, so a model's reply renders correctly at every token. `comarkOptions()` turns this off for files on disk; pass `{ ...comarkOptions(), autoClose: true }` for a reply that streams in.
- Components in Markdown that stay plain text, such as `::alert{type="warning"}`, drawn by your own Vue, React, or Svelte component, where marked needs a custom tokenizer and renderer.
- One parse tree for every renderer: Vue, React, Svelte, Angular, HTML, and the terminal. The tree is plain JSON, so a server parses once and the client renders without parsing again.
- [comark-ui](https://comark-ui.onmax.me), 40+ blocks for docs and reviews, from tabs and charts to annotated screenshots.

The cost is size and an async API: Comark is bigger than marked, and `renderHtml` returns a promise.

## The migration

```sh
pnpm add -D marked-to-comark
pnpm marked-to-comark check .                           # what's there and what each option becomes
pnpm marked-to-comark content "posts/**/*.md" --write   # escape Markdown Comark reads differently
pnpm marked-to-comark rewrite . --write                 # marked calls to renderHtml
pnpm marked-to-comark check .                           # what's left for you
```

Without `--write`, `content` and `rewrite` print the change and touch nothing. marked still renders every escaped file byte for byte as before, so you can migrate the Markdown first and switch the renderer later.

Rewritten code imports `comarkOptions` from `marked-to-comark/setup`, the Comark setup that reads Markdown like marked, without the rest of the package. It takes marked's own settings: `gfm`, `breaks`, `headerIds` and `headerPrefix` for marked before v7, `langPrefix`, and the settings that copy how older versions read tabs, tags, and tables. For extensions, [MKC0102](https://comark-ui.onmax.me/marked-to-comark/diagnostics#mkc0102) names the Comark plugin or [comark-ui](https://comark-ui.onmax.me) package that does the same job.

The same findings run as a [Vite Doctor](https://comark-ui.onmax.me/marked-to-comark/vite-doctor) extension, next to comark-linter.

## How close it gets

On 13,569 Markdown files from the 100 most-starred repositories that declare marked, Comark's parse tree matches marked's HTML for 96.6% after migration, once whitespace is normalized, with each project's marked version and setup on marked's side. Through `@comark/html` it's 88.3%, mostly because of that renderer's own formatting bugs. [How it was tested](https://comark-ui.onmax.me/marked-to-comark/testing) has the method and what still differs.

It leaves some work to you, and reports each piece:

- A call in a function that isn't async stays, since `renderHtml` returns a promise.
- A custom `renderer`, `tokenizer`, `walkTokens`, or `hooks` is your code to port. The check names the Comark component or plugin each becomes.
- Strings rendered at runtime need no changes; `content` is for Markdown files in the repository.
