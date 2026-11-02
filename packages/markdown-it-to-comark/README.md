# markdown-it-to-comark

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=markdown-it-to-comark&icon=npm)](https://npmx.dev/package/markdown-it-to-comark)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/markdown-it-to-comark)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/markdown-it-to-comark/)

Moves a project from [markdown-it](https://github.com/markdown-it/markdown-it) to [Comark](https://comark.dev). It finds every markdown-it setup in the code, rewrites the ones it can, runs markdown-it plugins on Comark with their own renderer rules, and escapes the Markdown Comark would read differently. What it can't do, it reports, with the fix and a docs link.

[Docs](https://comark-ui.onmax.me/markdown-it-to-comark/) · [Getting started](https://comark-ui.onmax.me/markdown-it-to-comark/getting-started/) · [Diagnostics](https://comark-ui.onmax.me/markdown-it-to-comark/diagnostics/) · [How it was tested](https://comark-ui.onmax.me/markdown-it-to-comark/testing/)

## Try it

Run the check without installing anything. It only reads the project:

```sh
pnpm dlx markdown-it-to-comark check .
# or
npx markdown-it-to-comark check .
```

```txt
[MIC0302] docs/guide.md:12 has 3 spots Comark would read differently from markdown-it, on lines 12, 30.
├▶ fix: Run `markdown-it-to-comark content "docs/guide.md" --write`; markdown-it renders the rewritten file exactly as before.
╰▶ see: https://comark-ui.onmax.me/markdown-it-to-comark/diagnostics#mic0302
```

`check` ends with what's left and the commands to run next. `--json` prints every finding for an agent.

## Why move to Comark

Comark parses with markdown-exit, a port of markdown-it, so your Markdown reads the same and your plugins' parsing rules run as they are. It's worth the move when you want what markdown-it doesn't do:

- Components in Markdown that stay plain text, such as `::alert{type="warning"}`, drawn by your own Vue, React, or Svelte component.
- One parse tree for every renderer: Vue, React, Svelte, Angular, HTML, and the terminal. The tree is plain JSON, so a server parses once and the client renders without parsing again.
- Streaming. Comark closes an unfinished `**bold`, code fence, or component, so a model's reply renders correctly at every token. `comarkOptions()` turns this off, since a file on disk is already complete.
- [comark-ui](https://comark-ui.onmax.me), 40+ blocks for docs and reviews, from tabs and charts to annotated screenshots.

markdown-it stays the smaller choice, and it renders synchronously; Comark returns a promise.

## The migration

```sh
pnpm add -D markdown-it-to-comark
pnpm markdown-it-to-comark check .                    # what's there and what each plugin becomes
pnpm markdown-it-to-comark content "**/*.md" --write  # escape Markdown Comark reads differently
pnpm markdown-it-to-comark rewrite . --write          # markdown-it instances to renderHtml
pnpm markdown-it-to-comark check .                    # what's left for you
```

Without `--write`, `content` and `rewrite` print the change and touch nothing. markdown-it still renders every escaped file byte for byte as before, so you can migrate the Markdown first and switch the renderer later.

Rewritten code imports `comarkOptions` from `markdown-it-to-comark/setup`, the Comark setup that reads Markdown like markdown-it with the same preset and options (`html`, `linkify`, `typographer`, `breaks`), and `markdownItPlugin` from `markdown-it-to-comark/plugins`, which runs a markdown-it plugin on Comark:

```ts
import { renderHtml } from "@comark/html";
import footnote from "markdown-it-footnote";
import { markdownItPlugin } from "markdown-it-to-comark/plugins";
import { comarkOptions } from "markdown-it-to-comark/setup";

const options = comarkOptions({ html: true, plugins: [markdownItPlugin(footnote)] });
const html = await renderHtml(markdown, options);
```

Comark builds its tree from tokens and doesn't call markdown-it's renderer, so a plugin's custom tokens and renderer rules would be lost. `markdownItPlugin()` draws those tokens with the plugin's own rules, so containers, footnotes, KaTeX, highlighters, and your own plugins keep their markup. For a styled Comark block instead, [MIC0102](https://comark-ui.onmax.me/markdown-it-to-comark/diagnostics#mic0102) names the [comark-ui](https://comark-ui.onmax.me) package that does the same job.

The same findings run as a [Vite Doctor](https://comark-ui.onmax.me/markdown-it-to-comark/vite-doctor/) extension, next to comark-linter.

## How close it gets

On 10,749 Markdown files from the 100 most-starred repositories that declare markdown-it, 97.7% parse to the same HTML in Comark as in markdown-it after migration, once whitespace is normalized, against 35.6% with Comark's defaults. Each of the 16 setups `rewrite` replaced renders those projects' documents the same. [How it was tested](https://comark-ui.onmax.me/markdown-it-to-comark/testing/) has the method, the groups of what still differs, and the Comark bugs found on the way.

It leaves some work to you, and reports each piece:

- `rewrite` only replaces an instance whose `render` calls sit in async functions, since `renderHtml` returns a promise.
- Framework setups (VitePress, VuePress, Vite Markdown plugins, Eleventy, VS Code) are reported, not rewritten, because the framework owns the instance.
- Plugins outside the tested list and renderer rules you set by hand run through `markdownItPlugin()`, but nobody has compared their output; check a few pages.
