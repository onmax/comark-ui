---
title: How it was tested
description: The 100 projects remark-to-comark ran on, what it checks on each, and what still differs.
---

remark-to-comark was run on the 100 most-starred GitHub repositories that declare a remark, rehype, unified, react-markdown, or MDX dependency, among them freeCodeCamp, n8n, Dify, Next.js, Supabase, and Storybook. Each run works on a copy of the project, with up to 300 Markdown files sampled from it.

On every project, the run checks that:

- `check`, `rewrite`, and `content` never throw.
- Rewritten code still parses and keeps its imports consistent, and a second run changes nothing.
- remark renders every escaped file byte for byte as before.
- Comark's HTML ends up no further from remark's than it was before the escapes.

## Results

Of 14,470 sampled documents that aren't MDX, 95.7% render the same HTML in Comark and in remark after migration, once whitespace is normalized. On the 31 projects whose remark plugins the test could load, it's 98.0%. No document broke the checks above. One project, MUI, ran past the test's 15-minute limit.

`rewrite` replaced 13 of the 161 unified chains it found, the other 148 having a reason to stay. Each of the 13 was rebuilt from its plugins and run against its replacement on that project's documents, and they match at 99.8 to 100%.

Most of what still differs are Comark bugs, 31 cases so far in [comarkdown/comark#525](https://github.com/comarkdown/comark/issues/525), each with a minimal input and a playground link. `comarkOptions()` works around the ones it can, such as tight lists that keep a `<p>` and Markdown images that lose `alt=""`.

## Speed and size

Comark renders the same Markdown to HTML 6 to 7 times faster than remark. Each pipeline rendered every file 15 times on Node 24.21.0, taking turns, and the table shows the median pass:

| Corpus | remark | remark + rehype-raw | Comark, `comarkOptions()` |
| --- | --: | --: | --: |
| 49 installed READMEs of remark, rehype, and unified packages (1,213 KiB) | 1,176 ms | 1,311 ms | 165 ms |
| 515 Markdown files in this repository (1,074 KiB) | 982 ms | 1,180 ms | 159 ms |

remark is remark-parse, remark-gfm, remark-frontmatter, remark-rehype, and rehype-stringify. rehype-raw parses raw HTML the way `comarkOptions()` keeps it.

In the browser Comark costs more. Minified and gzipped, the Comark setup is 118 KiB, remark 48 KiB, and remark with rehype-raw 98 KiB. Most of the difference is js-yaml, because Comark parses frontmatter into an object where remark-frontmatter keeps the string.

To rerun them, install the repository with `pnpm install --frozen-lockfile` and run these from `packages/remark-to-comark`. The first times the remark, rehype, and unified READMEs installed at the repository root, the second this repository's Markdown, and the third measures the bundles.

```sh
node bench/render.mjs "node_modules/.pnpm/*/node_modules/{remark*,rehype*,unified*}/{readme,README}.md"
node bench/render.mjs
node bench/size.mjs
```

Timings depend on the machine, and the README count on the installed versions. Each run prints its file count and size.
