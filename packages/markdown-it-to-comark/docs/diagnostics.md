---
title: Diagnostics
description: Every code markdown-it-to-comark reports, what it means, and what to do.
---

`markdown-it-to-comark check` and the [Vite Doctor extension](/markdown-it-to-comark/vite-doctor) report these codes. Warnings are work left. Info findings say what each plugin and option becomes.

To teach an agent Comark's blocks and plugins, run `npx skills add onmax/comark-ui`.

## mic0101

**A framework owns the markdown-it instance**: VitePress (`markdown.config`), VuePress (`extendMarkdown`), a Vite Markdown plugin (`markdownItSetup`), Eleventy (`setLibrary`, `amendLibrary`), or a VS Code extension (`extendMarkdownIt`). The framework calls markdown-it, so `rewrite` can't change it. Where the framework lets you, render the Markdown yourself with `renderHtml(markdown, comarkOptions())`. Otherwise keep markdown-it for that site.

The same code covers a function of yours that configures an instance it's given (`function setup(md) { md.use(…) }`). Whoever calls it owns the setup; move that code, and register the same plugins with `markdownItPlugin()`.

## mic0102

**A comark-ui package does the same job.** `markdownItPlugin()` keeps the plugin's exact output; the comark-ui package draws Comark's own styled block instead, with different markup, so check any CSS that styled the old markup.

| markdown-it plugin | comark-ui |
| --- | --- |
| markdown-it-footnote | [comark-footnotes](/footnotes) |
| markdown-it-anchor, markdown-it-link-attributes | [comark-links](/links) |
| markdown-it-table-of-contents, markdown-it-toc-done-right | [comark-outline](/outline) |
| markdown-it-katex, markdown-it-texmath | [comark-mathml](/math) |
| markdown-it-github-alerts | [comark-github](/github) |
| markdown-it-deflist | [comark-deflist](/deflist) |
| markdown-it-mark, -ins, -sub, -sup | [comark-mark](/mark) |
| markdown-it-container | [comark-details](/details) |
| markdown-it-multimd-table | [comark-table](/table) |

## mic0103

**Covered.** `comarkOptions()` already reads the option or plugin the way markdown-it does: `html`, `linkify`, `typographer`, `breaks`, `quotes`, a preset, or frontmatter. Nothing to do.

## mic0104

**The plugin runs on Comark through `markdownItPlugin()`**, renderer rules included, and the lab compared its output with markdown-it's on real projects. Register it where it was: `comarkOptions({ plugins: [markdownItPlugin(footnote)] })`, with the same options after the plugin.

## mic0105

**Your own plugin, a plugin not in the map, or a change you made to the instance by hand**, such as `md.renderer.rules.fence = …` or `md.core.ruler.push(…)`. `markdownItPlugin()` runs any markdown-it plugin, parser and renderer rules alike, so wrap a hand-made change in a function, `(md) => { md.renderer.rules.fence = … }`, and register that. Then compare a few pages rendered both ways before you rely on it.

## mic0106

**No Comark counterpart.** The finding says why: markdown-it-async wraps markdown-it, which Comark replaces, and markdown-it-include reads files while parsing, which Comark doesn't.

## mic0107

**An option that doesn't carry over as written.** A `highlight` function runs in markdown-it's fence renderer: register it as a plugin, `markdownItPlugin((md) => md.set({ highlight }))`, or use Comark's Shiki `highlight()` from `comark/plugins/highlight`. `langPrefix` and `xhtmlOut` change only markdown-it's HTML strings. An option held in a variable can't be read; write it as a literal.

## mic0201

**A setup `rewrite` can't replace without changing what it does.** The finding names the reason:

- A `render` call outside an async function. `renderHtml` returns a promise, so make the caller async and await it, or keep markdown-it there.
- The instance leaves the file: exported, returned, passed to another function, or stored on an object. Every caller would change.
- `renderInline`, `parse`, or an `env` argument, which Comark has no counterpart for.
- A plugin nobody has compared on Comark, or a change made by hand (MIC0105).
- Options that aren't literals, or CommonJS, since the rewrite writes ES imports.

## mic0202

**A setup `rewrite` can replace** with `comarkOptions({ … })` and `await renderHtml(markdown, options)`. Run `markdown-it-to-comark rewrite <dir> --write`, then install `comark`, `@comark/html`, and `markdown-it-to-comark`.

## mic0302

**Markdown Comark would read differently**: braces, brackets, and `:name` that Comark reads as attributes, spans, or components, and bare `[label]` references, which Comark reads as spans. Run `markdown-it-to-comark content <file> --write`. markdown-it still renders the file exactly as before.

## mic0303

**Left as written**, because no edit keeps markdown-it's output the same, or because markdown-it's text in that block couldn't be matched to the source (a tab inside indented text). Comark may read it differently. Fix it by hand, then run the check again.
