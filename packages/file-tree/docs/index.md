---
title: File tree
description: A project's folders and files, written in Markdown.
keywords: folder, directory, tree, project structure, files, file explorer, tree command
tagline: Indent the paths, or paste what `tree` prints, and get a tree of folders and files with what changed marked and a note on any line.
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

You write the tree in a fenced block, so names stay as they are. `__init__.py` isn't bold, and `[slug].vue` isn't a span. Folders are open `<details>`, so a reader folds the ones they don't need with no script.

## Usage

````md
::file-tree
```
src/
  + new.ts  # added in this change
  - old.ts
  ~ app.vue
  ...
README.md
```
::
````

Write one entry per line in a fenced block inside `::file-tree`. Any language, or none, works.

| Written | What it does |
| --- | --- |
| Two spaces before a name | Puts it inside the entry above that starts further left. Four spaces, or tabs, work the same. |
| `├──`, `└──`, `│` | Output pasted from `tree`, in Unicode or ASCII. Its `.` root and `3 directories, 5 files` summary are dropped. |
| A trailing `/` | Makes a folder. An entry with entries under it is a folder too, as `tree` prints them. |
| `+`, `-`, `~` and a space before a name | Marks it added, removed, or changed: a color, and the sign kept beside the name. |
| ` # ` and text after a name | A note, shown after it in a lighter color. A `#` that starts a name, as in `#notes.md`, is part of the name. |
| `...` | A placeholder for entries left out. |

### Why a fenced block

Starlight writes its file tree as a Markdown list, but in Comark a list mangles names. `__init__.py` turns bold, `[id].vue` becomes a span, and a `- #notes.md` line opens a slot that swallows every entry after it. Inside a fence, every character stays.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A Markdown list instead of a fence renders as the list, with the fix: write the tree in a fenced block.
- Content beside the fence doesn't render.
- An empty fence, or a block with nothing in it.
- A prop, which the block doesn't read.

Each issue names its block and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Icons of your own

`icons` maps a file name, an extension, or `name/` for a folder to any icon comark-icon resolves, on top of the built-in ones. `folder` and `file` set the fallbacks:

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

A name wins over an extension. An icon that doesn't resolve leaves its entry with the plain glyph.

## API

The plugin's options, `iconResolver` and `icons`, go under `fileTree` in `comarkUi()`, or to `fileTree()` when you use it alone. In `comarkUi()`, `iconResolver` defaults to the resolver built from the `icon` options, so each file gets the icon of its type.

### Icons

Without options, every folder and file gets the same plain glyph, and nothing is fetched. Pass an `iconResolver` from [comark-icon](/icon/) to give each file the icon of its type, the way VS Code shows it:

```ts
import { createIcons } from "comark-icon";
import fileTree from "comark-file-tree/html";

const icons = createIcons();
const plugins = [fileTree({ iconResolver: icons })];
```

The icons come from Iconify's [vscode-icons](https://icon-sets.iconify.design/vscode-icons/) set, through the API or a `collections` entry for `vscode-icons`. [Icons of your own](#icons-of-your-own) covers choosing your own.

### Your own renderer

The parse plugin replaces the block with a `file-tree` node holding one `file-tree-item` per entry, nested as the folders are:

```json
["file-tree", {},
  ["file-tree-item", { "type": "folder", "name": "src" },
    ["file-tree-item", { "type": "file", "name": "new.ts", "state": "added", "note": "added in this change" }],
    ["file-tree-item", { "type": "more" }]]]
```

`type` is `folder`, `file`, or `more`, `state` is `added`, `removed`, or `changed`, and `icon` is comark-icon's `IconData` when a resolver drew one.

### Package

comark-ui brings `comark-file-tree` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-file-tree
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import fileTree, { components } from "comark-file-tree/html";

const render = createHtmlRenderer({ plugins: [fileTree()], components });
```

For Vue, React, or Svelte, import from `comark-file-tree/vue`, `comark-file-tree/react`, or `comark-file-tree/svelte`. The components add the styles when they mount. When you render on a server, import `comark-file-tree/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A tree is a `<div class="cft">` of nested `<ul>`s. Each entry is an `<li>` with `data-type` and `data-state`, and a folder's holds `<details open>`. They read these [shared tokens](/guide/theming/):

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

Set `--cft-added`, `--cft-removed`, and `--cft-changed` on `.cft` to change the colors of marked entries. Removed entries follow shadcn/ui's `--destructive` by default.

The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the spacing that draws the tree. The margins, padding, and bullets of its lists, `details`, and `summary` are `!important`. A page's own list styles are almost always unlayered and would push entries off their guide lines. Override those with `!important` too.
