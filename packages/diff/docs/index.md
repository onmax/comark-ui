---
title: Diff
description: A code change in Markdown, shown like a suggested change in a pull request review.
keywords: suggested change, suggestion, code review, patch, before and after, changes, compare code, pull request, word diff
tagline: A suggested change, the way a pull request review shows one, from a file's lines before and after.
group: Review blocks
icon: file-diff
blurb: Compare two code fences
---

::examples
:::example{label="Suggested change"}
````md
::diff{line=212 label="Suggested change"}
```ts [packages/zoom/src/client.ts]
function close() {
  dialog.close();
  history.back();
}
```
```ts
function close() {
  dialog.close();
  if (opened) history.back();
}
```
::
````
:::

:::example{label="New file"}
````md
::diff{line=1}
```ts [src/limits.ts]
```
```ts
export const MAX_FILTERS = 3;
```
::
````
:::
::

## Features

- Two ordinary fenced blocks, before and after, become a suggested change like a review's.
- The header shows the file and how many lines were added and removed.
- Removed lines are red and added lines green. Within a pair of changed lines, the words that changed are a shade deeper.
- The line numbers and the `+` and `−` come from CSS, so copying a selection copies only the code.
- With Comark's `shiki` plugin, both blocks keep their highlighting.
- The output needs no script.

## Usage

Write two fenced blocks inside `::diff`, before then after, and nothing else. Name the file on the first block.

::example
````md
::diff
```ts [packages/zoom/src/client.ts]
history.back();
```
```ts
if (opened) history.back();
```
::
````
::

> [!NOTE]
> Keep both blocks to the lines around the change. One diff shows one file, and it takes no unified diff. It's for a change a reader should see, and a few lines before and after show that best.

### File

Use the `file` prop to name the file. Without it, the diff takes the name on the first block, like `` ```ts [src/a.ts] ``.

::example
````md
::diff{file="src/limits.ts"}
```ts
export const MAX_FILTERS = 3;
```
```ts
export const MAX_FILTERS = 5;
```
::
````
::

> [!NOTE]
> A diff needs one of the two. If both blocks name a file, it must be the same one.

### Line numbers

Use the `line` prop to number the lines. It's the file's line number for the first line of both blocks. Without it, the diff has no line numbers.

::example
````md
::diff{line=212}
```ts [packages/zoom/src/client.ts]
history.back();
```
```ts
if (opened) history.back();
```
::
````
::

### Label

Use the `label` prop to put a heading before the file name, such as "Suggested change".

::example
````md
::diff{label="Suggested change"}
```ts [packages/zoom/src/client.ts]
history.back();
```
```ts
if (opened) history.back();
```
::
````
::

### New or deleted file

Leave the first block empty for a new file, or the second for a deleted one.

::example
````md
::diff{line=1}
```ts [src/limits.ts]
```
```ts
export const MAX_FILTERS = 3;
```
::
````
::

### Highlighted lines

Use Comark's `shiki` plugin to keep both blocks' highlighting. A line a block highlights, like `` ```ts {2} ``, stays highlighted.

::example
````md
::diff
```ts [src/close.ts] {2}
function close() {
  history.back();
}
```
```ts {2}
function close() {
  if (opened) history.back();
}
```
::
````
::

## Accessibility

The header reads as the figure's caption: the label, the file, and the counts. The code scrolls in its own box, which is a tab stop, so a keyboard reaches a long line.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab` | Moves focus to the code. |
| `ArrowLeft`, `ArrowRight` | Scrolls a focused code box sideways. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `file` | The name on the first block | The file's path. A diff needs it here or on the first block. |
| `line` | — | The file's line number for the first line of both blocks, a whole number from 1. Without it, the diff has no line numbers. |
| `label` | — | A heading before the file name, such as "Suggested change". |

### Options

The plugin takes no options. In `comarkUi()`, `diff: false` turns it off.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes. Each issue names its diff, by its file, and says how to fix it:

- A count of code blocks other than two.
- Anything inside besides the two blocks.
- A ` ```diff ` or ` ```patch ` block, which is a unified diff.
- No file, on the block or in `file`.
- Two blocks that name different files, or have different languages.
- A `line` that isn't a whole number from 1.
- A block over 200 lines.
- Before and after that are the same.
- A prop `::diff` doesn't read, or a `:prop` bound to a value that is undefined.

Each kind has its own rule in [Doctor](/doctor/).

### Package

[comark-ui](/getting-started/) brings `comark-diff` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-diff
```

```ts
import { createHtmlRenderer } from "@comark/html";
import diff, { components } from "comark-diff/html";

const render = createHtmlRenderer({ plugins: [diff()], components });
```

It's HTML only: Vue, React, and Svelte have no diff components. The renderer inlines the styles once per document, and the output needs no script. Add Comark's `shiki` plugin to keep the code's highlighting. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A diff is a card in the style of shadcn/ui's Card, so it follows the shared tokens in [Theming](/guide/theming/) and turns dark with them. Removed and added lines take their own red and green, which mean something in any theme. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The card |
| `--comark-foreground` | The code, and mixed into the red and green of the counts and markers so they stay readable |
| `--comark-muted` | The icon, the file's name, and the line numbers |
| `--comark-border` | The card's edge and the line under the header |
| `--comark-accent` | The header, half and half with the background |
| `--comark-ring` | The focus ring on the code, and the bar beside a highlighted line |
| `--comark-radius` | The card's corners |
| `--comark-font` | The header's label |

With Comark's `shiki` plugin, the code's colors are Shiki's.

### Variables

Set them on `.cd`, the root of every diff:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cd-red` | `#ee3533`, `#fd736d` in dark mode | Removed lines, their numbers and `−`, the removed words, and the count of removed lines |
| `--cd-green` | `#259f56`, `#59d38c` in dark mode | Added lines, their numbers and `+`, the added words, and the count of added lines |
| `--cd-font` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | The code, the file's name, and the counts |

Lines take a tint of each color, and the changed words a deeper tint. The dark shades follow the system's dark mode. A site that turns dark with a `.dark` class has to set them too: `.dark .cd { --cd-red: #fd736d; --cd-green: #59d38c }`.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `figure.cd` | The card |
| `.cd > figcaption` | The header: the icon, the label, the file, and the counts |
| `.cd-icon` | The file icon |
| `.cd-label` | The `label`, such as "Suggested change" |
| `.cd-file` | The file's path |
| `.cd-counts` | The counts, `.cd-added` and `.cd-removed` |
| `.cd-scroll` | The box the code scrolls in when a line is too long |
| `table.cd-code` | The lines, with the first block's Shiki class when it has one |
| `tr.cd-del`, `tr.cd-add`, `tr.cd-same` | A removed, added, or unchanged line, with `data-highlight` when its block highlights it |
| `.cd-num` | A line number, in `data-line`; two per line, before and after, and only with `line` |
| `.cd-line` | The code of a line, with its `+` or `−` in `::before` |
| `.cd-code del`, `.cd-code ins` | The words that changed within a pair of lines |

### Example

GitHub's colors, the page's code font, and no deeper shade on the changed words:

```css
.cd {
  --cd-red: #cf222e;
  --cd-green: #1a7f37;
  --cd-font: "JetBrains Mono", monospace;
}

.cd-code :is(del, ins) {
  background: none;
}
```
