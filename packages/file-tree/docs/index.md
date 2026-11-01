---
title: File tree
description: A project's folders and files, written in Markdown.
keywords: folder, directory, tree, project structure, files, file explorer, tree command
tagline: A tree of a project's folders and files, written as indented paths or pasted from `tree`.
group: Docs blocks
icon: folder-tree
blurb: Folders and files
credits: 'After <a href="https://starlight.astro.build/components/file-tree/">Starlight</a>''s file tree. Glyphs from <a href="https://lucide.dev">Lucide</a>, and icons from <a href="https://github.com/vscode-icons/vscode-icons">vscode-icons</a> through comark-icon.'
---

::examples
:::example{label="Indented"}
````md
::file-tree
```
src/
  components/
    Button.vue  # the one every page uses
    ...
  pages/
    [slug].vue
  app.config.ts
package.json
```
::
````
:::

:::example{label="What changed"}
````md
::file-tree
```
packages/
  steps/
    + src/
      + index.ts  # the parse plugin
    ~ package.json
    - legacy.ts  # folded into index.ts
```
::
````
:::

:::example{label="From tree"}
````md
::file-tree
```
.
├── docs
│   └── index.md
├── src
│   └── __init__.py
└── pyproject.toml

2 directories, 3 files
```
::
````
:::
::

## Features

- The tree sits in a fenced block, so `__init__.py` isn't bold and `[slug].vue` isn't a span.
- Output pasted from `tree`, in Unicode or ASCII, reads the same as indented paths.
- Mark entries added, removed, or changed, and add a note to any line.
- Folders are open `<details>` a reader can fold.
- With [comark-icon](/icon/), each file gets its type's icon, as in VS Code.

## Usage

Write one entry per line in a fenced block inside `::file-tree`, with any language or none.

::example
````md
::file-tree
```
src/
  app.vue
README.md
```
::
````
::

### Nesting

Use two spaces before a name to put it inside the nearest entry above that starts further left. Four spaces or tabs work too.

::example
````md
::file-tree
```
src/
  components/
    Button.vue
  app.vue
```
::
````
::

### Folders

Use a trailing `/` to make a folder. An entry with entries under it is a folder too, as `tree` prints them.

```md
docs/
src
  index.ts
```

### Output from tree

Paste what `tree` prints, in Unicode or ASCII. The block drops its `.` root and its `3 directories, 5 files` summary.

::example
````md
::file-tree
```
.
├── src
│   └── index.ts
└── package.json

1 directory, 2 files
```
::
````
::

### Changes

Use `+`, `-`, or `~` and a space before a name to mark it added, removed, or changed. The entry takes a color and keeps the sign, and a removed one is struck through.

::example
````md
::file-tree
```
src/
  + index.ts
  ~ app.vue
  - legacy.ts
```
::
````
::

### Notes

Use ` # ` and text after a name to add a note, shown after it in a lighter color.

::example
````md
::file-tree
```
src/
  Button.vue  # the one every page uses
#notes.md
```
::
````
::

> [!NOTE]
> A `#` that starts a name, as in `#notes.md`, is part of the name. A note needs a space on both sides of its `#`.

### Placeholder

Use `...` or `…` for entries left out.

::example
````md
::file-tree
```
src/
  index.ts
  ...
```
::
````
::

## Examples

### Icons of your own

Use the `icons` option to map a file name, an extension, or `name/` for a folder to any icon comark-icon resolves, on top of the built-in ones. `folder` and `file` set the fallbacks:

```ts
import { createIcons } from "comark-icon";
import fileTree from "comark-file-tree/html";

fileTree({
  iconResolver: createIcons(),
  icons: {
    "nuxt.config.ts": "vscode-icons:file-type-nuxt",
    ".vue": "logos:vue",
    "docs/": "lucide:book-open",
    file: "lucide:file",
  },
});
```

A name wins over an extension, and names match in any case. An icon that doesn't resolve leaves the plain glyph.

## Accessibility

Each folder is a native `<details>`, so the browser handles focus and keys. A folder's name is a tab stop, and files aren't.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Enter`, `Space` | Folds or opens the focused folder. |
| `Tab`, `Shift+Tab` | Moves focus to the next or previous folder. |

## API

### Props

`::file-tree` takes no props. A prop adds an issue.

### Syntax

| Written | Description |
| --- | --- |
| Two spaces before a name | Puts it inside the entry above that starts further left. Four spaces, or tabs, work the same. |
| `├──`, `└──`, `│` | Output pasted from `tree`, in Unicode or ASCII. Its `.` root and `3 directories, 5 files` summary are dropped. |
| A trailing `/` | Makes a folder. An entry with entries under it is a folder too. |
| `+`, `-`, `~` and a space before a name | Marks it added, removed, or changed: a color, and the sign kept beside the name. |
| ` # ` and text after a name | A note, shown after it in a lighter color. A `#` that starts a name is part of the name. |
| `...` or `…` | A placeholder for entries left out. |

### Options

Pass options under `fileTree` in `comarkUi()`, or to `fileTree()` alone.

| Option | Default | Description |
| --- | --- | --- |
| `iconResolver` | — | Resolves each entry's icon, from `createIcons()` in [comark-icon](/icon/). Without it, every entry gets a plain glyph and nothing is fetched. `comarkUi()` passes the resolver built from the `icon` options. |
| `icons` | Iconify's vscode-icons | Icons by file name, extension, or `name/` for a folder, on top of the built-in ones. `folder` and `file` set the fallbacks. |

Pass an `iconResolver` to give each file its type's icon:

```ts
import { createIcons } from "comark-icon";
import fileTree from "comark-file-tree/html";

const icons = createIcons();
const plugins = [fileTree({ iconResolver: icons })];
```

The icons come from Iconify's [vscode-icons](https://icon-sets.iconify.design/vscode-icons/) set, through the API or a `collections` entry for `vscode-icons`. To pick your own, see [Icons of your own](#icons-of-your-own).

### Your own renderer

The parse plugin replaces the block with a `file-tree` node holding one `file-tree-item` per entry, nested as the folders are:

```json
["file-tree", {},
  ["file-tree-item", { "type": "folder", "name": "src" },
    ["file-tree-item", { "type": "file", "name": "new.ts", "state": "added", "note": "added in this change" }],
    ["file-tree-item", { "type": "more" }]]]
```

`type` is `folder`, `file`, or `more`, `state` is `added`, `removed`, or `changed`, and `icon` is comark-icon's `IconData` when a resolver drew one.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A Markdown list instead of a fence. It renders as the list, and the issue says to use a fenced block.
- Content beside the fence doesn't render, and only the first fenced block does.
- An empty fence, or a block with nothing in it.
- A prop, which the block doesn't read.

Each one has its own rule in [Doctor](/doctor/).

### Package

comark-ui installs and registers `comark-file-tree`. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-file-tree
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import fileTree, { components } from "comark-file-tree/html";

const render = createHtmlRenderer({ plugins: [fileTree()], components });
```

For Vue, React, or Svelte, import from `comark-file-tree/vue`, `comark-file-tree/react`, or `comark-file-tree/svelte`. The components add the styles on mount. On a server, import `comark-file-tree/style.css` with your styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Trees follow the shared tokens in [Theming](/guide/theming/), and a variable per kind of change.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The box |
| `--comark-foreground` | Names |
| `--comark-muted` | Glyphs, notes, placeholders |
| `--comark-border` | The box, the guide line down each folder |
| `--comark-accent` | A hovered folder |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners |
| `--comark-font` | Notes |

### Variables

Set these on `.cft`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cft-added` | `--comark-success` | Added entries |
| `--cft-removed` | `--comark-danger` | Removed entries |
| `--cft-changed` | `--comark-warning` | Changed entries |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cft` | The tree, a `<div>` of nested `<ul>`s |
| `li[data-type]` | An entry, with `data-type` (`folder`, `file`, or `more`) and `data-state` when it's marked. A folder's holds `<details open>`. |
| `.cft-entry` | An entry's row |
| `.cft-glyph`, `.cft-mark`, `.cft-name`, `.cft-note` | The plain glyph, the change sign, the name, and the note |

### Important rules

The rules sit in a `comark` CSS layer, so any plain rule of yours wins, except the spacing that draws the tree. The margins, padding, and bullets of its lists, `details`, and `summary` are `!important`, so override them with `!important` too.
