---
title: migrate-to-comark
description: A wizard that finds the Markdown libraries a project uses and moves it to Comark with each library's migrator.
keywords: migration, migrate, wizard, codemod, remark, markdown-it, marked, unified, react-markdown, VitePress, Comark
tagline: One command that finds remark, markdown-it, or marked in a project and moves it to Comark.
install: npx migrate-to-comark
group: Migration
label: Overview
icon: wand-sparkles
blurb: Move any project to Comark
---

migrate-to-comark reads every package.json in a project, finds the Markdown libraries it uses, and runs the migrator for each one. It shows what each migrator found, asks, and then writes the changes.

```sh
npx migrate-to-comark
```

## What it finds

| Library | Found through | Migrator |
| --- | --- | --- |
| remark | unified, remark and rehype plugins, react-markdown, streamdown, MDX, Astro, Docusaurus, Gatsby, Nextra, Fumadocs, Nuxt Content, Contentlayer, Velite | [remark-to-comark](/remark-to-comark/) |
| markdown-it | markdown-it and its plugins, VitePress, VuePress, Slidev, Eleventy, Hexo, Marp | [markdown-it-to-comark](/markdown-it-to-comark/) |
| marked | marked and its extensions, svelte-markdown, ngx-markdown | [marked-to-comark](/marked-to-comark/) |

showdown, Markdoc, markdown-to-jsx, commonmark.js, snarkdown, and markdown-wasm have no migrator yet. The wizard names them and leaves them alone.

## What it writes

The wizard writes only what each migrator's own `rewrite --write` and `content --write` would. Before writing a file, it checks the file hasn't changed since the check read it. Each migrator checks every Markdown file, so in a project with two libraries both want the same files. A file goes to the library that its nearest package.json declares, such as a VitePress site's own package. When that package.json declares both libraries, or none above the file declares either, the wizard leaves the file alone and names both migrators.

On the 100 projects remark-to-comark was [tested on](/remark-to-comark/testing/), `npx migrate-to-comark --yes` writes the same files, byte for byte, as running remark-to-comark's `content` and `rewrite` by hand.

Everything else stays with each migrator: the warnings, what each plugin becomes, and the fixes. The wizard ends with the command that lists them.

## Usage

[Getting started](/migrate-to-comark/getting-started/) covers the wizard and its flags.
