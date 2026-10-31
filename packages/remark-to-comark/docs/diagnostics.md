---
title: Diagnostics
description: Every code remark-to-comark reports, what it means, and what to do.
---

`remark-to-comark check` and the Vite Doctor extension (`remark-to-comark/doctor`) report the same findings as [nostics](https://github.com/vercel-labs/nostics) diagnostics. Each has a code, what was found, what to do, and a link to its section here. Warnings are work left, and info findings are the plan. `--json` prints them for agents.

The comark-ui docs cover the packages the findings point to, and the comark-ui skill (`npx skills add onmax/comark-ui`) teaches an agent Comark's blocks and plugins.

## rtc0101

**A framework owns the remark setup** (Astro, Next.js MDX, Contentlayer, Docusaurus, Gatsby, Velite, Nuxt). The framework calls remark itself, so the rewrite can't swap the parser in its config. The plugin findings that follow still say what each plugin becomes.

The same code covers react-markdown's `remarkPlugins` and `rehypePlugins` props. Replace the component with `<Markdown>` from @comark/react, or @comark/vue, and pass it the Comark plugins the findings name.

Render the Markdown yourself where the framework allows it, such as an Astro content loader or a Next.js route, with `renderHtml(markdown, comarkOptions())`. For Nuxt, `@comark/nuxt` renders Comark directly. Otherwise keep remark for that site.

## rtc0102

**A comark-ui package does what the plugin does.** comark-ui packages take their colors from the `--comark-*` tokens and render in HTML, Vue, React, and Svelte. Their markup isn't the remark plugin's, so check the pages that style the old markup. When a port with output identical to the remark plugin exists too, the finding names it.

| remark plugin | comark-ui |
| --- | --- |
| remark-gfm footnotes | [comark-footnotes](https://comark-ui.onmax.me/footnotes/) |
| rehype-autolink-headings, rehype-external-links | [comark-links](https://comark-ui.onmax.me/links/) |
| remark-toc, rehype-toc | [comark-outline](https://comark-ui.onmax.me/outline/) |
| remark-reading-time | [comark-reading-time](https://comark-ui.onmax.me/reading-time/) |
| remark-math, rehype-katex, rehype-mathjax | [comark-mathml](https://comark-ui.onmax.me/math/) |
| remark-github-blockquote-alert, remark-github | [comark-github](https://comark-ui.onmax.me/github/) |
| Docusaurus npm2yarn | [comark-tabs](https://comark-ui.onmax.me/tabs/) |
| remark-deflist | [comark-deflist](https://comark-ui.onmax.me/deflist/) |
| rehype-figure | [comark-figure](https://comark-ui.onmax.me/figure/) |
| remark-embedder, remark-oembed | [comark-embed](https://comark-ui.onmax.me/embed/) |
| remark-kbd | [comark-keys](https://comark-ui.onmax.me/keys/) |
| remark-supersub | [comark-mark](https://comark-ui.onmax.me/mark/) |

## rtc0103

**Covered.** `comarkOptions()` reads GFM, frontmatter, and raw HTML the way remark does, Comark gives headings ids and reads `{#id}` attributes and fence filenames itself, or a Comark plugin replaces the remark one. Nothing to do.

## rtc0104

**A port in `remark-to-comark/plugins` replaces the plugin.** The ports are `slug`, `autolinkHeadings`, `externalLinks`, `unwrapImages`, `squeezeParagraphs`, `npm2yarn`, and `readingTime`, and each one's tests compare its HTML with the original plugin's. Options carry over.

## rtc0105

**The project's own plugin**, or an expression the scan can't follow (a ternary, a call result, an inline function). Port it to a Comark plugin, a `post` hook that walks `state.tree.nodes`, where an element is `[tag, attributes, ...children]`. The ports in `remark-to-comark/plugins` are small examples to copy. Then render a few of the project's pages with both and compare the HTML.

## rtc0106

**No Comark counterpart.** The note says why and what to do. A plugin that works on the finished HTML, like a minifier, can stay as a rehype step on the HTML Comark renders. A plugin the map doesn't know yet needs a port, and its own test fixtures are the spec.

## rtc0107

**A lint plugin.** Lint Comark documents with [comark-linter](https://comark-ui.onmax.me/lint/), as a CLI or a Vite Doctor extension.

## rtc0201

**A unified chain that can't be rewritten without changing what it does.** The reason says which: a plugin without a counterpart (port it first), HTML options in a variable (write them as literals), a VFile read from the result, a callback, an object input, or CommonJS (change the call by hand). A chain that ends in `.parse()` or `.run()` works on the syntax tree, not on HTML. Keep remark for it, or port the tree code to the nodes `parseMarkdown()` returns.

## rtc0202

**A unified chain the rewrite can replace** with `renderHtml(markdown, comarkOptions({ plugins }))`. Run `remark-to-comark rewrite <dir> --write` and install `@comark/html` and the packages it imports.

## rtc0301

**MDX is left alone.** JSX that only passes props maps to Comark components (`<Callout type="tip">` → `::callout{type="tip"}`); expressions and imports need a JavaScript runtime Comark doesn't have. To convert by hand, rename the file to `.md` and run `remark-to-comark content` on it while it holds only prose, then add the Comark components. `content` escapes Comark syntax, so running it after you add components would disable them. Keep MDX for pages that run code.

Docusaurus v3 compiles `.md` files as MDX too, unless `docusaurus.config` sets `markdown: { format: "detect" }`, so the check counts them here and `content` won't touch them. If they hold no JSX, set `format: "detect"`, make sure the site still builds, and run the check again.

## rtc0302

**Markdown Comark would read differently from remark**: braces, brackets, and `:name` it would read as attributes, spans, or components, single-tilde strikethrough, and bare `[label]` references. Run `remark-to-comark content <file> --write`. The rewrite only edits text remark read as text, so remark renders the file exactly as before.

## rtc0303

**A block left as written**, because no edit kept remark's output the same. Comark may read it differently. There are two cases.

- A URL follows an unclosed `[`. remark links that URL in a later pass, and escaping the `[` can move where the link ends, so `content` edits such a block only when remark still renders it exactly as before. Escape the bracket by hand where it's plain text, or wrap the URL in `<…>`.
- A strikethrough sits inside another one (`~a~~b~~a~`) or inside a reference label (`[~a~]`). Widening `~` to `~~` there changes how the tildes pair up, or breaks the reference. Rewrite it with `~~` by hand.

Then run the check again.

RTC0303 also reports an entire document left alone when multiple setups inside its nearest package or framework config directory disagree about syntax. The command can't prove which renderer owns that document. Identify its renderer and migrate it by hand with that setup's syntax settings; plugins from another site are never combined with its own.
