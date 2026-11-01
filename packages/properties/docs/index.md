---
title: Properties
description: A document's frontmatter as a box of properties, written in Markdown.
keywords: frontmatter, front matter, metadata, YAML, header, status, author, date, tags, document properties, Obsidian properties
tagline: A box that shows a document's status, pull request, author, date, and tags from its frontmatter.
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

## Features

- The box shows only the frontmatter keys you choose, so a layout or a slug stays out of the page.
- A pull request or issue link reads as `owner/repo#123`, any other link as its address, and a list as badges.
- The box goes first in the document, or wherever `::properties` sits.
- The box skips a missing or empty key, and a document with none of the keys gets no box.

## Usage

Write the keys in the frontmatter, and the box shows them at the top of the document.

::example
```md
---
status: Draft
author: onmax
---

The loft moves to the roof in spring.
```
::

### Placement

Use `::properties` to put the box somewhere else, such as under the title.

::example
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
::

> [!NOTE]
> `::properties` takes no props and no content. Close it with `::` on the next line.

### Values

Each value shows by its kind:

| Value | Shows as |
| --- | --- |
| `status` | A pill with a dot |
| A date such as `2026-10-23` | `Oct 23, 2026` in the reader's locale, such as `23 oct 2026` in Spanish, in a `time` element that keeps the date as written |
| Text, a number, `true` or `false` | Itself |
| A GitHub or GitLab pull request, merge request, or issue link | `owner/repo#123`, linked |
| Any other `http(s)` link | Its host and path, linked |
| A list | One badge per item |

::example
```md
---
pr: https://github.com/onmax/comark-ui/pull/111
tags: [colors, docs]
---

The palette page now shows every token.
```
::

> [!NOTE]
> An object, or a list of lists, isn't shown.

## Examples

### Review documents with a status

Put the facts a reviewer scans for in the frontmatter. The box shows them, and a script can read them:

```md
---
status: Changes requested
pr: https://github.com/onmax/comark-ui/pull/111
author: claude
date: 2026-10-23
tags: [colors, docs]
---
```

### Your own keys and labels

Use the `keys` option to choose the keys, so fields only your tooling reads stay off the page. Use `labels` to name them:

```ts
properties({ keys: ["status", "owner", "due"], labels: { due: "Due date" } });
```

### Icons beside the labels

Each row has a [Lucide](https://lucide.dev) icon before its label, picked by `data-kind`. The default keys get `status`, `pr`, `person` for `author`, `date`, and `tags`. Any other key gets `link`, `date`, `tags`, `number`, `boolean`, or `text` by its value. Set `--cfm-icon` to a mask image to change one:

```css
.cfm [data-key="owner"] { --cfm-icon: url("https://api.iconify.design/lucide/crown.svg"); }
```

[A pull request description](/recipes/pull-request/) combines the box with numbers and a test run.

## API

### Props

`::properties` takes no props. The `keys` option chooses what it shows.

### Options

Pass options under `properties` in `comarkUi()`, or to `properties()` alone.

| Option | Default | Description |
| --- | --- | --- |
| `keys` | `["status", "pr", "author", "date", "tags"]` | The frontmatter keys to show, in this order. The box skips missing keys. |
| `labels` | `{}` | A label per key, such as `{ pr: "Pull request" }`. Without one, a key shows capitalized, with dashes and underscores as spaces, and `pr` and `url` show as "PR" and "URL". |
| `top` | `true` | Puts the box at the top of a document that has no `::properties`. `false` shows the box only where `::properties` sits. |
| `locale` | none | The locale dates show in, such as `"de-DE"`, for every reader. Without it, dates render in English and a small script, or the component once mounted, rewrites them in the reader's locale. |

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A value that's an object or a list of lists. It isn't shown.
- A `::properties` with nothing to show.
- Content inside `::properties`. The block drops it.
- A prop on `::properties`. It's ignored.
- An invalid `locale` option. It's ignored, so dates use the reader's locale.

Each names the key or block and the fix, and has its own rule in [Doctor](/doctor/).

### Package

comark-ui installs and registers `comark-properties`. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-properties
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import properties, { components } from "comark-properties/html";

const render = createHtmlRenderer({ plugins: [properties()], components });
```

For Vue, React, or Svelte, import from `comark-properties/vue`, `comark-properties/react`, or `comark-properties/svelte`. The components add the styles on mount. Import `comark-properties/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The box reads the [shared tokens](/guide/theming/). The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-foreground` | The values |
| `--comark-border` | The line under the rows, and the badges' and the status pill's borders |
| `--comark-muted` | The labels, their icons, and the status dot |
| `--comark-accent` | Behind badges |
| `--comark-ring` | Focus rings on links |
| `--comark-radius` | Corners |
| `--comark-font` | The rows' text |

### Classes

| Class | Element |
| --- | --- |
| `.cfm` | The rows, a `dl` with one `div` of `dt` and `dd` per key, each with `data-key` and `data-kind` |
| `.cfm-status` | The status pill |
| `.cfm-tag` | A badge of a list |
