---
title: Getting started
description: Check a remark project, rewrite its unified chains, migrate its Markdown, and check again.
install: pnpm add -D remark-to-comark
---

Check the project, migrate the Markdown, rewrite the unified chains, and check again.

## Installation

```sh
pnpm add -D remark-to-comark
```

## Check the project

```sh
pnpm remark-to-comark check .
```

`check` prints one diagnostic per finding, warnings first, each linking its section in [Diagnostics](/remark-to-comark/diagnostics/). `--verbose` adds what each plugin becomes, and `--json` prints everything for agents.

## Migrate the Markdown

```sh
pnpm remark-to-comark content "**/*.{md,mdx}"          # what it would change
pnpm remark-to-comark content "**/*.{md,mdx}" --write  # apply it
```

`content` reads each file with the project's own syntax plugins, such as remark-math, and escapes only text remark reads as text. It finds those plugins in the code `rewrite` replaces, so run it first. It skips MDX, including the `.md` files Docusaurus compiles as MDX. If the project renders with `comarkOptions({ syntax: "plain" })`, pass `--syntax plain` to skip the escaping.

In a monorepo, each file follows the setups of its nearest package or framework config. If those disagree, `content` skips the file and reports RTC0303. With `--write`, it still writes the other files but exits with an error.

## Rewrite unified chains

```sh
pnpm remark-to-comark rewrite .          # what it would change
pnpm remark-to-comark rewrite . --write  # apply it
```

A chain like `unified().use(remarkParse).use(remarkRehype).use(rehypeStringify).process(markdown)` becomes `renderHtml(markdown, comarkOptions({ … }))`, with the same raw HTML, GFM, and frontmatter settings. A chain it can't replace without changing the output stays, and the check says why. Install what the new code imports:

```sh
pnpm add comark @comark/html remark-to-comark
```

## Check again

```sh
pnpm remark-to-comark check .
```

What's left is yours: framework configs, your own plugins, chains it couldn't rewrite, MDX, and blocks left as written.
