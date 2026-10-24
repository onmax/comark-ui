---
title: Properties
description: A document's frontmatter as a box of properties, written in Markdown.
keywords: frontmatter, front matter, metadata, YAML, header, status, author, date, tags, document properties, Obsidian properties
tagline: Keep a review document's status, pull request, author, date, and tags in its frontmatter, and readers see them in a box at the top.
group: Review blocks
icon: list-collapse
blurb: Frontmatter as a properties box
credits: 'After <a href="https://docs.gitlab.com/user/markdown/#front-matter">GitLab</a>''s front matter box and <a href="https://help.obsidian.md/properties">Obsidian</a>''s Properties.'
---

::examples
:::example{label="Review"}
```md
---
status: Ready for review
pr: https://github.com/onmax/comark-ui/pull/111
author: onmax
date: 2026-10-23
tags: [colors, docs]
---

The palette page now shows every token of the pigeon tracker's theme.
```
:::

:::example{label="Placed"}
```md
---
status: Draft
author: onmax
---

# Loft redesign

::properties
::

The loft moves to the roof in spring.
```
:::
::

Only the keys you choose are shown, so the rest of the frontmatter, such as a layout or a slug, stays out of the page. A pull request or issue link reads as `owner/repo#123`, any other link as its address, and a list as badges.

## Usage

The box goes at the top of the document, before anything else. To put it somewhere else, such as under the title, write `::properties` there:

```md
# Loft redesign

::properties
::
```

| Value | Shows as |
| --- | --- |
| Text, a number, `true` or `false` | Itself. A date such as `2026-10-23` stays as written. |
| A GitHub or GitLab pull request, merge request, or issue link | `owner/repo#123`, linked |
| Any other `http(s)` link | Its host and path, linked |
| A list | One badge per item |

A key that's missing or empty is skipped, and a document with none of the keys gets no box.

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a value that's an object or a list of lists (it isn't shown), a `::properties` with nothing to show, content inside it (it's dropped), and a prop on it (it's ignored). Each issue names the key or block and says how to fix it, and each has its own rule in [Doctor](/doctor/).

## Examples

### Review documents with a status

Agents that write review documents can keep the facts a reviewer scans for in the frontmatter, where a script can read them too, and the box shows them on the page:

```md
---
status: Changes requested
pr: https://github.com/onmax/comark-ui/pull/111
author: claude
date: 2026-10-23
tags: [colors, docs]
---
```

Choose the keys with the `keys` option, so the same frontmatter can carry fields that only your tooling reads.

### Icons beside the labels

Each row carries its key in `data-key`, so CSS can put an icon before a label without a plugin. This one draws [Lucide](https://lucide.dev) icons from the Iconify API as masks, so they take the label's color:

```css
.cfm dt::before {
  content: "";
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-inline-end: 0.375rem;
  vertical-align: -0.125em;
  background: currentColor;
  mask: var(--key-icon, linear-gradient(transparent 0 0)) center / contain no-repeat;
}

.cfm [data-key="status"] { --key-icon: url("https://api.iconify.design/lucide/circle-dot.svg"); }
.cfm [data-key="pr"] { --key-icon: url("https://api.iconify.design/lucide/git-pull-request.svg"); }
.cfm [data-key="author"] { --key-icon: url("https://api.iconify.design/lucide/user.svg"); }
.cfm [data-key="date"] { --key-icon: url("https://api.iconify.design/lucide/calendar.svg"); }
.cfm [data-key="tags"] { --key-icon: url("https://api.iconify.design/lucide/tags.svg"); }
```

A key with no icon gets a transparent mask, so its room stays empty and the labels still line up. [A pull request description](/recipes/pull-request/) puts the box together with icons, numbers, and a test run.

## API

These options go under `properties` in `comarkUi()`, or to `properties()` when you use the plugin alone.

### Options

| Option | Default | What it does |
| --- | --- | --- |
| `keys` | `["status", "pr", "author", "date", "tags"]` | The frontmatter keys to show, in this order. A key the frontmatter doesn't have is skipped. |
| `labels` | `{}` | A label per key, such as `{ pr: "Pull request" }`. Without one a key shows capitalized, and `pr` as "PR". |
| `top` | `true` | Puts the box at the top of a document that has no `::properties`. Set it to `false` to show the box only where `::properties` sits. |

```ts
properties({ keys: ["status", "owner", "due"], labels: { due: "Due date" } });
```

### Package

comark-ui brings `comark-properties` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-properties
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import properties, { components } from "comark-properties/html";

const render = createHtmlRenderer({ plugins: [properties()], components });
```

For Vue, React, or Svelte, import from `comark-properties/vue`, `comark-properties/react`, or `comark-properties/svelte`; the components add the styles when they mount. Import `comark-properties/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The box reads the [shared tokens](/guide/theming/): `--comark-background`, `--comark-foreground`, and `--comark-border` for the box, `--comark-muted` for the labels, `--comark-accent` behind badges, `--comark-ring` for focus rings, `--comark-radius` for corners, and `--comark-font`. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

| Class | Element |
| --- | --- |
| `.cfm` | The box, a `dl` with one `div` of `dt` and `dd` per key, each with `data-key` |
| `.cfm-tag` | A badge of a list |
