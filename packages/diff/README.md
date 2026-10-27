# comark-diff

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-diff&icon=npm)](https://npmx.dev/package/comark-diff)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-diff&period=month&icon=npm)](https://npmx.dev/package/comark-diff)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-diff)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/diff/)

A code change in Markdown, shown the way a pull request review shows a suggested change: the file and its counts in a header, removed lines red, added lines green, and the changed words marked within a pair of lines. A [Comark](https://comark.dev) plugin for HTML, with no script.

```sh
pnpm add comark comark-diff
```

```ts
import { createHtmlRenderer } from "@comark/html";
import diff, { components } from "comark-diff/html";

const render = createHtmlRenderer({ plugins: [diff()], components });
```

Write the code before and after as two fenced blocks:

````md
::diff{line=12 label="Suggested change"}
```ts [src/zoom/client.ts]
const gap = 8
history.back()
```
```ts
const gap = 8
if (opened) history.back()
```
::
````

The file comes from the first block's name or a `file` prop. `line` is the file's line number for the first line and turns on line numbers; `label` is optional. Leave a block empty for a file that's added or deleted. With Comark's `shiki` plugin, the code keeps its highlighting, and a line a block highlights, like `` ```ts {2} ``, stays highlighted.

One diff shows one file and a few lines around the change; it takes no unified diff. The plugin adds every problem to `meta.issues`, one sentence each naming the block and the fix, such as two blocks in different languages, a block over 200 lines, or a diff with no change, so a host can reject a document before publishing it.

## Customize

The styles follow shadcn/ui's Card: they read its CSS variables, such as `--background`, `--border`, and `--accent`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme the diff with the other comark plugins, `--cd-red` and `--cd-green` to recolor the lines, and `--cd-font` for the code's font. The rules sit in a `comark` CSS layer, so any plain rule of your own wins; see the diff's [Theming page](https://comark-ui.onmax.me/diff/#theme).

The icon is [Lucide](https://lucide.dev)'s, under its license (see `LICENSE`).

Docs and live demos: [comark-ui.onmax.me/diff](https://comark-ui.onmax.me/diff).
