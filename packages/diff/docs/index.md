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
- The header shows the file and the counts of added and removed lines.
- Removed lines are red and added lines green, with the changed words a shade deeper.
- The line numbers and the `+` and `−` come from CSS, so copying a selection copies only the code.
- To mark changes inside one block, such as pasted `git diff` output, use a `diff` fence with [Code](/code/#diffs).

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
> One diff shows one file and takes no unified diff. Keep both blocks to the few lines around the change.

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

Use the `line` prop to number the lines. Set it to the file's line number where both blocks start. Without it, the diff has no line numbers.

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

The header, with the label, file, and counts, is the figure's caption. The code scrolls in its own box, a tab stop, so a keyboard reaches a long line.

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

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes. Each names its diff by file and says how to fix it:

- A count of code blocks other than two.
- Anything inside besides the two blocks.
- A ` ```diff ` or ` ```patch ` block, which is a unified diff.
- No file, on the block or in `file`.
- Two blocks that name different files, or have different languages.
- A `line` that isn't a whole number from 1.
- A block over 200 lines.
- Before and after that are the same.
- A prop `::diff` doesn't read, or a `:prop` bound to an undefined value.

Each kind has its own rule in [Doctor](/doctor/).

### Package

[comark-ui](/getting-started/) installs and registers `comark-diff`. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-diff
```

```ts
import { createHtmlRenderer } from "@comark/html";
import diff, { components } from "comark-diff/html";

const render = createHtmlRenderer({ plugins: [diff()], components });
```

It's HTML only, with no Vue, React, or Svelte components. Add Comark's `shiki` plugin to keep the highlighting. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A diff is a card like shadcn/ui's Card, so it follows the shared tokens in [Theming](/guide/theming/), dark mode included. Removed and added lines keep their own red and green in any theme. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The card |
| `--comark-foreground` | The code, and mixed into the counts' and markers' red and green so they stay readable |
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
| `--cd-red` | `--comark-danger` | Removed lines, their numbers and `−`, the removed words, and the count of removed lines |
| `--cd-green` | `--comark-success` | Added lines, their numbers and `+`, the added words, and the count of added lines |
| `--cd-font` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | The code, the file's name, and the counts |

Lines take a tint of each color, and the changed words a deeper tint. Both follow the shared status tokens, which lighten in dark mode.

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
| `.cd-num` | A line number, in `data-line`. Two per line, before and after, and only with `line` |
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
