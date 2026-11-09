---
title: Getting started
description: Check a markdown-it project, migrate its Markdown, rewrite its setups, and check again.
install: pnpm add -D markdown-it-to-comark
---

Check the project, migrate the Markdown, rewrite the markdown-it setups, and check again.

## Installation

```sh
pnpm add -D markdown-it-to-comark
```

## Check the project

```sh
pnpm markdown-it-to-comark check .
```

`check` prints one diagnostic per finding, warnings first, each linking its section in [Diagnostics](/markdown-it-to-comark/diagnostics). `--verbose` adds what each plugin and option becomes, and `--json` prints everything for agents.

## Migrate the Markdown

```sh
pnpm markdown-it-to-comark content "**/*.md"          # what it would change
pnpm markdown-it-to-comark content "**/*.md" --write  # apply it
```

`content` reads each file with the project's own preset, options, and plugins, and escapes only what markdown-it reads as text: `{`, `[`, and `:name`, which Comark reads as attributes, spans, and components. Then it renders the file with markdown-it again and keeps an edit only if the HTML is byte for byte the same. Code, raw HTML, and frontmatter stay as written.

`::: name` containers stay too when the project registers markdown-it-container for that name, or renders with VitePress or VuePress: `markdownItPlugin()` carries the container over, so Comark reads it as markdown-it did. A `:::` line markdown-it shows as text gets escaped, since Comark would read it as a component.

In a monorepo, each file follows the setups of its nearest package or VitePress or VuePress site. When several setups could render a file, an edit stays only if all of them render it the same. If the project renders with `comarkOptions({ syntax: "plain" })`, pass `--syntax plain` to skip the escaping.

## Rewrite markdown-it setups

```sh
pnpm markdown-it-to-comark rewrite .          # what it would change
pnpm markdown-it-to-comark rewrite . --write  # apply it
```

An instance the code creates and only renders with becomes Comark options, and each `md.render(markdown)` becomes `(await renderHtml(markdown, md))`:

```ts
// before
const md = new MarkdownIt({ html: true }).use(footnote);
export async function render(source: string) {
  return md.render(source);
}

// after
const md = comarkOptions({ html: true, plugins: [markdownItPlugin(footnote)] });
export async function render(source: string) {
  return (await renderHtml(source, md));
}
```

It leaves an instance whose behavior would change and says why: a `render` call outside an async function, an instance that leaves the file, a renderer rule set by hand, options that aren't literals, or a plugin nobody has compared on Comark. Install what the new code imports:

```sh
pnpm add comark @comark/html markdown-it-to-comark
```

## Check again

```sh
pnpm markdown-it-to-comark check .
```

What's left is yours: framework setups, your own plugins and renderer rules, setups it couldn't rewrite, and blocks left as written.
