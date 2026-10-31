---
name: comark-ui
description: Writes PR evidence, explanations of how something works, and docs pages in Markdown with comark-ui. Use when a document needs an annotated screenshot, a before/after, a chart, a diagram, a code change, or another comark block, or when setting up comark-ui or a comark-* package.
---

# comark-ui

You write Markdown, and the comark plugins render it as static HTML. The reader sees only what you measured and wrote down, so measure every mark from the page, take every number from the data, and check the render before you hand it over.

## Install

Install `comark-ui` by default. It holds every plugin and registers them in the order they need:

```sh
pnpm add comark @comark/html comark-ui
```

Run the comark CLIs with the [global Vite+ CLI](https://viteplus.dev/guide/global-cli): `vp dlx` for a package the project doesn't install, `vp exec` for one it does. Without Vite+, `pnpm dlx` and `pnpm exec` take the same arguments.

```ts
import { createHtmlRenderer } from "@comark/html";
import comarkUi from "comark-ui/html";

const render = createHtmlRenderer(comarkUi());
```

Every plugin is on except `include`. The [comark-ui reference](references/ui.md) covers its options, the plugins that read files or use the network, and its Vue, React, and Svelte entries.

To use only some plugins, install those packages and register each plugin with its components:

```sh
pnpm add comark @comark/html comark-annotate
```

```ts
import { createHtmlRenderer } from "@comark/html";
import annotate, { components } from "comark-annotate/html";

const render = createHtmlRenderer({ plugins: [annotate()], components });
```

Each reference ends with a Register section that says how its package registers alone and which options it needs.

Either way, the HTML renderer inlines the styles once per document, and the Vue, React, and Svelte components add them on mount. On a server-rendered page, import each package's `style.css`, such as `comark-cards/style.css`, so the page doesn't shift.

The `--comark-*` tokens theme every plugin at once; https://comark-ui.onmax.me/guide/theming/ lists them. In a Nuxt UI app the plugins follow its `--ui-*` variables with no setup. For a page rendered outside the app, such as review evidence, put the CSS from `nuxtUiTheme({ colors: appConfig.ui?.colors, css: mainCss })` (from `comark-ui/nuxt-ui`) in a `<style>`, so the page matches the app.

A project that renders Markdown with remark moves to Comark with `remark-to-comark`; the [remark-to-comark reference](references/remark-to-comark.md) walks through it.

Problems land in `meta.issues` after `parseMarkdown`, one sentence each, and a host can refuse a document while any remain. For untrusted input, add Comark's `security` plugin with `blockedTags` such as `script`, `style`, and `iframe`; it cleans the Markdown inside blocks too.

## Shape the document

This skill teaches the blocks. Four sibling skills teach a whole document, what goes in it and in what order: `before-after-evidence`, `review-document`, `visual-explanation`, and `teach-lesson`. When the user asks for one of those and it isn't installed, suggest `vp dlx skills add onmax/comark-ui` and picking it from the list.

## Pick the blocks

Read the reference for each block you use before you write it. Mix the blocks freely with ordinary Markdown, such as headings, tables, and lists.

### Review blocks

| To show | Write | Reference |
| --- | --- | --- |
| One state of a screen, with marks, numbered notes, or arrows | `::screenshot` | [annotate](references/annotate.md) |
| A change on screen, before and after | `::compare` | [annotate](references/annotate.md) |
| A command's output, such as a test run or a build, as colored text | `::cast` | [cast](references/cast.md) |
| Numbers, such as sizes, timings, before/after metrics, a trend, or a timeline | `::chart` | [charts](references/charts.md) |
| A flow, a sequence, an architecture, or a schema as a diagram | a `mermaid`, `d2`, `dot`, `plantuml`, `dbml`, `goat`, or `svgbob` fence | [diagrams](references/diagrams.md) |
| Links and `@mentions` with the site's favicon or the person's avatar | links, `@user`, `:chip` | [chips](references/chips.md) |
| Colors, such as design tokens before and after, or a palette | a color in inline code, `::palette` | [colors](references/colors.md) |
| A suggested change to one file, before and after | `::diff` | [diff](references/diff.md) |
| Suggested edits and comment threads on prose, such as a copy review, each note in a card in the margin | `:suggestion`, `:comment` | [comments](references/comments.md) |
| A video, a design file, or a live reproduction from its link | `::embed` | [embed](references/embed.md) |
| A screen recording or a sound that a screenshot can't show | `![alt](clip.mp4)` | [media](references/media.md) |
| A number before and after, a table of befores and afters, or progress | `:delta`, `::stats`, `:progress` | [metrics](references/metrics.md) |
| Data from a CSV, TSV, or JSON fence or file, as a table that copies and sorts | `::table`, a `csv` fence | [table](references/table.md) |
| A test run's passed, failed, and skipped counts and its failures, from a JUnit report | `::tests` | [tests](references/tests.md) |
| A note, tip, or warning box, or long output folded away, as on GitHub | `> [!NOTE]`, `<details>` | [github](references/github.md) |
| The review's status, pull request, author, date, and tags in a box | frontmatter, `::properties` | [properties](references/properties.md) |
| Claims backed by links, with numbered citations | `:cite`, `::sources` | [sources](references/sources.md) |
| An icon in a sentence or a table cell, such as a logo or a status | `:icon` | [icon](references/icon.md) |
| A preview link a reviewer can scan with a phone | `:qr` | [qr](references/qr.md) |
| Why a line of code is there, as numbered notes under it | `// <1>` and a numbered list | [code-notes](references/code-notes.md) |

### Page behavior

| To show | Write | Reference |
| --- | --- | --- |
| A stable link to a section, or a link that opens a new tab | `{#id}`, `{target="_blank"}` | [links](references/links.md) |
| A table, code block, or diagram too small to read in place | `::zoom` | [zoom](references/zoom.md) |
| A sequence to page through in one place, such as the screens of a flow | `::carousel` | [carousel](references/carousel.md) |
| Versions of one thing where each reader needs only one, such as an OS or a package manager | `::tabs`, `::code-group`, `pm` | [tabs](references/tabs.md) |
| Code with lines marked added, removed, or highlighted, or a pasted `git diff` | `ins={4}` after a fence's language, `diff lang="ts"` | [code](references/code.md) |

### Docs blocks

| To show | Write | Reference |
| --- | --- | --- |
| Content a reader may skip, such as a long log, behind a summary | `::details`, `::accordion`, `::collapsible` | [details](references/details.md) |
| Folders and files, with what a change added, removed, or changed | `::file-tree` | [file-tree](references/file-tree.md) |
| A component's props or a function's options, with types and defaults | `::field` | [fields](references/fields.md) |
| A version, status, or deprecation tag in a heading or a sentence | `:badge` | [badge](references/badge.md) |
| Links to the next pages as cards, or blocks side by side | `::card-group`, `::columns` | [cards](references/cards.md) |
| Instructions the reader follows in order, such as repro or setup steps | `::steps` | [steps](references/steps.md) |
| Code that changes over several steps, such as a refactor told one move at a time | `::magic-move` | [magic-move](references/magic-move.md) |
| An interactive lesson question, poll, or recall card | `::question`, `::poll`, `::recall` | [quiz](references/quiz.md) |

### Markdown syntax

| To show | Write | Reference |
| --- | --- | --- |
| Bold or italics in Chinese, Japanese, or Korean text | `**…**`, `*…*` | [cjk](references/cjk.md) |
| An image with a caption under it | `![alt](src "Caption")` | [figure](references/figure.md) |
| A highlighted phrase or a superscript | `==text==`, `^2^` | [mark](references/mark.md) |
| A suggested edit or a comment inside the text | `{++ ++}`, `{-- --}`, `{~~ ~> ~~}`, `{== ==}`, `{>> <<}` | [critic](references/critic.md) |
| Terms and their definitions, such as a glossary | `Term`, then `: definition` | [deflist](references/deflist.md) |
| A numbered note at the end of the page, such as a source or a caveat | `[^label]`, `^[note]` | [footnotes](references/footnotes.md) |
| A formula, such as a complexity bound or how a number was computed | `$…$`, `$$…$$` | [math](references/math.md) |
| A keyboard shortcut | `++ctrl+k++` | [keys](references/keys.md) |

### Authoring tools

| To show | Write | Reference |
| --- | --- | --- |
| A shared section, or real source lines, pasted from a file | `:include{src}` | [include](references/include.md) |
| A table of contents of the page's headings | `::toc` | [outline](references/outline.md) |
| Figures and tables numbered and referred to by number | `{#fig-name}`, `:ref{#fig-name}` | [xref](references/xref.md) |
| Word count and reading time, for the page's layout | nothing; it writes `meta.readingTime` | [reading-time](references/reading-time.md) |

### Chat

| To show | Use | Reference |
| --- | --- | --- |
| An AI SDK chat message, with its reasoning, tool calls, sources, and files | `MessageParts` from `comark-chat` | [chat](references/chat.md) |

## Marks

Screenshots and charts draw the same marks. Each `::annotation` is one mark and its note, written in Markdown.

- `mark` is `box` (default), `circle`, `underline`, `line`, `highlight`, `bracket`, `cross`, `check`, or `none`, which draws nothing, so its note needs a `side` and the arrow alone points.
- `color` is `violet` (default) to point something out, `red` for a problem, `amber` for a warning, `green` for a fix, `blue` for a second voice, `gray` for neutral, or a 3- or 6-digit hex color.
- `side` is `top`, `bottom`, `left`, or `right`, and puts the note in that margin with an arrow to its mark. Notes without one are numbered in a list under the figure.

Mark only what your text talks about. Write each note in the words the screen or table shows, saying what changed or what is wrong, so the reader can check it against the figure. Leave out a value the figure doesn't show.

## Check the result

1. Lint the file with `vp exec comark-lint report.md`, in a project with `comark-linter` and the plugins installed (`comark-ui` counts as every plugin). It prints one line per problem with its line, its rule, and the fix, and exits with 1 while any remain. Fix every problem and run it again until it exits with 0. The [lint reference](references/lint.md) covers the flags, the config file, the library, ESLint, and Vite Doctor.
2. Render the document as the block's reference says, open it in a browser, and take a screenshot. Each mark must sit on its target, each number must match its note, and each chart must say what your text says. Name anything you couldn't verify when you hand the document over.
