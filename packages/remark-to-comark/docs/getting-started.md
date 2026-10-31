---
title: Getting started
description: Check a remark project, rewrite its unified chains, migrate its Markdown, and check again.
install: pnpm add -D remark-to-comark
---

Run the check, migrate the Markdown, rewrite the unified chains, and run the check again to see what's left.

## Installation

```sh
pnpm add -D remark-to-comark
```

## Check the project

```sh
pnpm remark-to-comark check .
```

`check` reads the project's code and Markdown and prints one diagnostic per finding, warnings first. `--verbose` adds the info findings, which say what each plugin becomes. `--json` prints every finding with its full file list, for agents. Each diagnostic links its section in [Diagnostics](/remark-to-comark/diagnostics/).

## Migrate the Markdown

```sh
pnpm remark-to-comark content "**/*.{md,mdx}"          # what it would change
pnpm remark-to-comark content "**/*.{md,mdx}" --write  # apply it
```

`content` parses each file with the project's own syntax plugins, such as remark-math, and edits only text remark read as text. It finds those plugins in the code `rewrite` replaces, so run it first. With `--syntax plain` it skips the escaping, for a project that reads its Markdown with `comarkOptions({ syntax: "plain" })`, where Comark's component syntax is off. MDX files, and the `.md` files a Docusaurus site compiles as MDX, are reported and left alone.

In a monorepo, each document uses the setups inside its nearest package or framework config directory. A sibling site's syntax plugins, GFM, alert markers, and emoji settings don't apply to it. If the setups in that scope disagree, `content` leaves the file alone and reports RTC0303; migrate it by hand using its renderer's settings. With `--write`, skipped files make the command exit unsuccessfully while independent files can still be migrated.

## Rewrite unified chains

```sh
pnpm remark-to-comark rewrite .          # what it would change
pnpm remark-to-comark rewrite . --write  # apply it
```

A chain like `unified().use(remarkParse).use(remarkRehype).use(rehypeStringify).process(markdown)` becomes `renderHtml(markdown, comarkOptions({ … }))`. Raw HTML stays kept or dropped as the chain had it, and GFM and frontmatter stay off when the chain didn't use remark-gfm or remark-frontmatter. Identifier inputs need a uniquely bound const string or a parameter typed as `string`; imported, untyped, reassigned, and ambiguous bindings stay for manual migration. A chain it can't replace without changing what it does stays as it is, with the reason. Install what the rewritten code imports:

```sh
pnpm add comark @comark/html remark-to-comark
```

## Check again

```sh
pnpm remark-to-comark check .
```

What's left is the work the migration leaves to you: framework configs, the project's own plugins, chains that couldn't be rewritten, MDX, and blocks left as written.
