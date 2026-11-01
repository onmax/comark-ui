# remark-to-comark

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=remark-to-comark&icon=npm)](https://npmx.dev/package/remark-to-comark)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/remark-to-comark)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/remark-to-comark/)

Moves a project from [remark](https://github.com/remarkjs/remark) to [Comark](https://comark.dev). It finds every remark setup in the code, rewrites the unified chains it can, and escapes the Markdown Comark would read differently. What it can't do, it reports, with the fix and a docs link.

[Docs](https://comark-ui.onmax.me/remark-to-comark/) · [Getting started](https://comark-ui.onmax.me/remark-to-comark/getting-started/) · [Diagnostics](https://comark-ui.onmax.me/remark-to-comark/diagnostics/) · [How it was tested](https://comark-ui.onmax.me/remark-to-comark/testing/)

## Try it

Run the check without installing anything. It only reads the project:

```sh
pnpm dlx remark-to-comark check .
# or
npx remark-to-comark check .
```

```txt
[RTC0302] docs/guide.md:12 has 3 spots Comark would read differently from remark, on lines 12, 30.
├▶ fix: Run `remark-to-comark content "docs/guide.md" --write`; remark renders the rewritten file exactly as before.
╰▶ see: https://comark-ui.onmax.me/remark-to-comark/diagnostics#rtc0302
```

`check` ends with what's left and the commands to run next. `--json` prints every finding for an agent.

## Why move to Comark

remark has the bigger plugin ecosystem, and for Markdown to HTML on a server it works fine. Comark is worth the move when you want what remark doesn't do:

- Components in Markdown that stay plain text, such as `::alert{type="warning"}`, drawn by your own Vue, React, or Svelte component.
- One parse tree for every renderer: Vue, React, Svelte, Angular, HTML, and the terminal. The tree is plain JSON, so a server parses once and the client renders without parsing again.
- Streaming. Comark closes an unfinished `**bold`, code fence, or component, so a model's reply renders correctly at every token. `comarkOptions()` turns this off, since a file on disk is already complete.
- [comark-ui](https://comark-ui.onmax.me), 40+ blocks for docs and reviews, from tabs and charts to annotated screenshots.

It's also 6 to 7 times faster in these measurements. Rendering the same files to HTML on Node 24.21.0, median of 15 passes:

| Corpus | remark | Comark, `comarkOptions()` | Speedup |
| --- | --: | --: | --: |
| 49 installed READMEs of remark, rehype, and unified packages (1,213 KiB) | 1,176 ms | 165 ms | 7.1× |
| 515 Markdown files in this repository (1,074 KiB) | 982 ms | 159 ms | 6.2× |

remark here is remark-parse, remark-gfm, remark-frontmatter, remark-rehype, and rehype-stringify. Adding rehype-raw, which keeps raw HTML the way `comarkOptions()` does, makes it 11 to 20% slower. [Speed and size](https://comark-ui.onmax.me/remark-to-comark/testing/#speed-and-size) has the full table and the exact commands to select both corpora. Timings and installed README counts vary by machine and installation.

The cost is size in the browser. Minified, the Comark setup is 118 KiB gzipped and the remark pipeline 48 KiB, or 98 KiB with rehype-raw. Most of the difference is js-yaml, because Comark parses frontmatter into an object where remark-frontmatter keeps a string. [`bench/`](https://github.com/onmax/comark-ui/tree/main/packages/remark-to-comark/bench) has the scripts that measured both.

## The migration

```sh
pnpm add -D remark-to-comark
pnpm remark-to-comark check .                           # what's there and what each plugin becomes
pnpm remark-to-comark content "**/*.{md,mdx}" --write   # escape Markdown Comark reads differently
pnpm remark-to-comark rewrite . --write                 # unified chains to renderHtml
pnpm remark-to-comark check .                           # what's left for you
```

Without `--write`, `content` and `rewrite` print the change and touch nothing. remark still renders every escaped file byte for byte as before, so you can migrate the Markdown first and switch the renderer later.

Rewritten code imports `comarkOptions` from `remark-to-comark/setup`, the Comark setup that reads Markdown like remark-parse with remark-gfm, without the rest of the package. `remark-to-comark/plugins` has Comark versions of rehype-slug, rehype-autolink-headings, rehype-external-links, rehype-unwrap-images, remark-squeeze-paragraphs, remark-reading-time, and Docusaurus' npm2yarn, each tested against the original. For other plugins, [RTC0102](https://comark-ui.onmax.me/remark-to-comark/diagnostics#rtc0102) names the [comark-ui](https://comark-ui.onmax.me) package that does the same job.

The same findings run as a [Vite Doctor](https://comark-ui.onmax.me/remark-to-comark/vite-doctor/) extension, next to comark-linter.

## How close it gets

On 14,470 Markdown files from the 100 most-starred repositories with a remark dependency, 95.7% render the same HTML in Comark as in remark after migration, once whitespace is normalized. Most of the rest are Comark bugs, each with a minimal input in [comarkdown/comark#525](https://github.com/comarkdown/comark/issues/525).

It leaves some work to you, and reports each piece:

- MDX stays as it is. JSX and expressions need a JavaScript runtime Comark doesn't have.
- Framework configs (Astro, Next.js, Docusaurus, Gatsby, Nuxt) are reported, not rewritten, because the framework owns the parser.
- A project's own remark plugins need porting by hand.
