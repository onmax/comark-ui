---
title: Getting started
description: Check a remark project, rewrite its unified chains, migrate its Markdown, and check again.
install: pnpm add -D remark-to-comark
---

Run the check, apply the two rewrites it suggests, and run the check again to see what's left.

## Installation

```sh
pnpm add -D remark-to-comark
```

## Check the project

```sh
pnpm remark-to-comark check .
```

`check` reads the project's code and Markdown and prints one diagnostic per finding, warnings first. Info findings, the plan for each plugin, show with `--verbose`; `--json` prints every finding with its full file list, for agents. Each diagnostic links its section in [Diagnostics](/remark-to-comark/diagnostics/).

## Rewrite unified chains

```sh
pnpm remark-to-comark rewrite .          # what it would change
pnpm remark-to-comark rewrite . --write  # apply it
```

A chain like `unified().use(remarkParse).use(remarkRehype).use(rehypeStringify).process(markdown)` becomes `renderHtml(markdown, comarkOptions({ … }))`. It keeps the HTML policy, turns off GFM and frontmatter when the chain didn't have them, and leaves any chain it can't replace without changing what it does, with the reason. Install what the rewritten code imports:

```sh
pnpm add comark @comark/html remark-to-comark
```

## Migrate the Markdown

```sh
pnpm remark-to-comark content "**/*.{md,mdx}"          # what it would change
pnpm remark-to-comark content "**/*.{md,mdx}" --write  # apply it
```

`content` parses each file with the project's own syntax plugins and edits only text remark read as text. `--syntax plain` turns Comark's component syntax off instead, so the files need no escaping, and `comarkOptions({ syntax: "plain" })` reads them that way. MDX files, and the `.md` files a Docusaurus site compiles as MDX, are reported and left alone.

## Check again

```sh
pnpm remark-to-comark check .
```

What's left is the work the migration leaves to you: framework configs, the project's own plugins, chains that couldn't be rewritten, MDX, and blocks left as written.
