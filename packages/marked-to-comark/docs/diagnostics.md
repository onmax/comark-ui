---
title: Diagnostics
description: Every code marked-to-comark reports, what it means, and what to do.
---

`marked-to-comark check` and the [Vite Doctor extension](/marked-to-comark/vite-doctor/) report these codes. Warnings are work left. Info findings say what each option and extension becomes.

To teach an agent Comark's blocks and plugins, run `npx skills add onmax/comark-ui`.

## mkc0101

**A marked setup the scan can't read**, such as `marked.use(...extensions)`, `setOptions(options)` with options built elsewhere, or a spread. Write the options and extensions as literals in the `use()`, `setOptions()`, or `new Marked()` call, so the check can say what each becomes and `content` knows how the Markdown is read.

## mkc0102

**A comark-ui package replaces the extension.** Its markup differs from the extension's, so check any CSS that styled the old markup.

| marked | comark-ui |
| --- | --- |
| marked-highlight (`markedHighlight()` keeps its markup, MKC0104), marked-shiki, the `highlight` option | [comark-code](https://comark-ui.onmax.me/code/) |
| marked-katex-extension | [comark-mathml](https://comark-ui.onmax.me/math/) |
| marked-footnote | [comark-footnotes](https://comark-ui.onmax.me/footnotes/) |
| marked-alert | [comark-github](https://comark-ui.onmax.me/github/) |
| marked-mermaid | [comark-diagrams](https://comark-ui.onmax.me/diagrams/) |

## mkc0103

**Covered.** Comark or `comarkOptions()` already does what the option or extension did: `gfm`, `breaks`, `headerIds` and `headerPrefix`, `langPrefix`, marked-gfm-heading-id, marked-smartypants, and others. For marked before v18, `rewrite` also passes the settings that copy that version's reading: heading ids before v7, tabs before v14, tag names with underscores from v1 to v17, and marked 0.3's tables and code classes. The finding names the `comarkOptions()` setting when there is one. Nothing to do; `rewrite` carries it over.

## mkc0104

**A port in `marked-to-comark/plugins` replaces the extension**, with the same options and output: `markedHighlight()` for marked-highlight, which runs your own highlighter (highlight.js, Prism). Its tests compare its HTML with the original's. `rewrite` registers it for you.

## mkc0105

**Your own code for marked**: a `renderer`, `tokenizer`, `walkTokens`, `hooks`, or an extension you wrote. The finding says what it becomes. A renderer that changes how one element looks, such as links that open in a new tab, becomes a component for that element (`components: { a }` in @comark/html, or your framework's renderer). Anything that changes what's parsed becomes a Comark plugin. Then compare the HTML of a few of your documents rendered both ways.

## mkc0106

**No Comark counterpart**, such as `pedantic`, `sanitize`, or marked-terminal. The finding says why and what to do. For `sanitize`, keep sanitizing the HTML Comark renders, with DOMPurify, and add Comark's security plugin for untrusted input.

## mkc0201

**A marked call `rewrite` can't replace without changing what it does.** The finding names the reason:

- It runs in a function that isn't async. `renderHtml` returns a promise, so the function and its callers would change. Make it async, then run `rewrite` again.
- It calls the shared `marked`, which another file configures or calls. Its settings reach every call, so move them together, or use a `new Marked()` instance in one file.
- It uses your own code, or an option or extension with no counterpart. Port or drop it first (see MKC0105 and MKC0106).
- It renders inline Markdown (`parseInline`), or works on marked's tokens (`lexer`, `parser`).
- It's CommonJS. The rewrite writes ES imports.

## mkc0202

**A marked call `rewrite` can replace** with `await renderHtml(markdown, comarkOptions({ … }))`. Run `marked-to-comark rewrite <dir> --write`, then install `comark`, `@comark/html`, and `marked-to-comark`.

## mkc0302

**Markdown Comark would read differently**, such as braces, brackets, and `:name` that Comark reads as attributes, spans, or components, single-tilde strikethrough, bare `[label]` references, and `#` headings followed by a no-break space. Run `marked-to-comark content <file> --write`. marked still renders the file exactly as before.

## mkc0303

**Left as written**, because no edit keeps marked's output the same. Comark may read it differently. Escape what Comark reads as syntax by hand where marked keeps it as text (`\{`, `\[`, `\:`), then run the check again.

The same code skips a whole document when the marked setups in its package disagree about `gfm` or `pedantic`, when those options are set in code, or when your own tokenizer changes what marked parses. Migrate it by hand with the settings of the setup that renders it.

## mkc0304

**Markdown no marked code reads.** The check migrates the Markdown in folders your marked code names. The rest is usually rendered by something else, such as GitHub or a docs site. If marked renders any of it, run `marked-to-comark content` on those files.
