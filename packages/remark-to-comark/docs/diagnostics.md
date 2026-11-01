---
title: Diagnostics
description: Every code remark-to-comark reports, what it means, and what to do.
---

`remark-to-comark check` and the [Vite Doctor extension](/remark-to-comark/vite-doctor/) report these codes. Warnings are work left. Info findings say what each plugin becomes.

To teach an agent Comark's blocks and plugins, run `npx skills add onmax/comark-ui`.

## rtc0101

**A framework owns the remark setup** (Astro, Next.js MDX, Contentlayer, Docusaurus, Gatsby, Velite, Nuxt). The framework calls remark, so `rewrite` can't change it. Where the framework lets you, render the Markdown yourself with `renderHtml(markdown, comarkOptions())`, such as in an Astro content loader or a Next.js route. Nuxt has `@comark/nuxt`. Otherwise keep remark for that site.

The same code covers react-markdown's `remarkPlugins` and `rehypePlugins`. Swap the component for `<Markdown>` from @comark/react or @comark/vue, with the Comark plugins the findings name.

## rtc0102

**A comark-ui package replaces the plugin.** Its markup differs from the remark plugin's, so check any CSS that styled the old markup. If a port with identical output exists too, the finding names it.

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

**Covered.** Comark or `comarkOptions()` already does what the plugin did, such as GFM, frontmatter, raw HTML, and heading ids. Nothing to do.

## rtc0104

**A port in `remark-to-comark/plugins` replaces the plugin**, with the same options: `slug`, `autolinkHeadings`, `externalLinks`, `unwrapImages`, `squeezeParagraphs`, `npm2yarn`, or `readingTime`. Each port's tests compare its HTML with the original's.

## rtc0105

**Your own plugin**, or a plugin list the scan can't follow, such as a ternary or a function call. Port it to a Comark plugin, a `post` hook that walks `state.tree.nodes`, where an element is `[tag, attributes, ...children]`. The ports in `remark-to-comark/plugins` are short examples. Then compare the HTML of a few pages rendered both ways.

## rtc0106

**No Comark counterpart.** The finding says why. A plugin that only touches the final HTML, like a minifier, can keep running on Comark's HTML. Anything else needs a port, and the plugin's test fixtures are the spec.

## rtc0107

**A lint plugin.** Lint Comark documents with [comark-linter](https://comark-ui.onmax.me/lint/), as a CLI or a Vite Doctor extension.

## rtc0201

**A unified chain `rewrite` can't replace without changing what it does.** The finding names the reason. Port a plugin with no counterpart first, write HTML options as literals, and change callbacks, VFile reads, object inputs, and CommonJS by hand. A chain that ends in `.parse()` or `.run()` works on the syntax tree, so keep remark for it or port that code to the nodes `parseMarkdown()` returns.

## rtc0202

**A unified chain `rewrite` can replace** with `renderHtml(markdown, comarkOptions({ plugins }))`. Run `remark-to-comark rewrite <dir> --write`, then install `@comark/html` and the other packages it imports.

## rtc0301

**MDX is left alone**, because expressions and imports need a JavaScript runtime. JSX that only passes props maps to Comark components, so `<Callout type="tip">` becomes `::callout{type="tip"}`. To convert a page by hand, rename it to `.md`, run `remark-to-comark content` on it while it's still plain prose, then add the components. Running `content` after that would escape them. Keep MDX for pages that run code.

Docusaurus v3 compiles `.md` as MDX too, unless `docusaurus.config` sets `markdown: { format: "detect" }`. If those files have no JSX, set it, check that the site builds, and run the check again.

## rtc0302

**Markdown Comark would read differently**, such as braces, brackets, and `:name` that Comark reads as attributes, spans, or components, single-tilde strikethrough, and bare `[label]` references. Run `remark-to-comark content <file> --write`. remark still renders the file exactly as before.

## rtc0303

**Left as written**, because no edit keeps remark's output the same. Comark may read it differently. Fix it by hand, then run the check again.

- A URL after an unclosed `[`. Escape the `[` where it's plain text, or wrap the URL in `<…>`.
- A strikethrough inside another one (`~a~~b~~a~`) or inside a reference label (`[~a~]`). Rewrite it with `~~`.

The same code skips a whole document when:

- Setups in its package or framework config disagree about syntax. Migrate it with the settings of the renderer that owns it.
- A plugin list isn't static, such as `remarkPlugins={getPlugins()}` or `[enabled && gfm]`. Use imported plugins, `[plugin]` tuples, or a local `const` array that nothing changes, exports, or passes on.
- A syntax plugin has options, such as `[gfm, { singleTilde: false }]`. Migrate it by hand with those settings.
