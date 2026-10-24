# comark-file-tree

[![npm version](https://npmx.dev/api/registry/badge/version/comark-file-tree)](https://npmx.dev/package/comark-file-tree)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-file-tree)](https://npmx.dev/package/comark-file-tree)
[![install size](https://npmx.dev/api/registry/badge/size/comark-file-tree)](https://npmx.dev/package/comark-file-tree)
[![license](https://npmx.dev/api/registry/badge/license/comark-file-tree)](https://npmx.dev/package/comark-file-tree)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/file-tree/)

A project's folders and files from an indented list in a fenced block, or pasted `tree` output, with added, removed, and changed entries marked and a note on any line. Folders are open `<details>`, so there's no script. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-file-tree
```

```ts
import { createHtmlRenderer } from "@comark/html";
import fileTree, { components } from "comark-file-tree/html";

const render = createHtmlRenderer({ plugins: [fileTree()], components });
```

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

Indent each level by two spaces, or paste what `tree` prints. A trailing `/` makes a folder; `+`, `-`, and `~` mark an entry added, removed, or changed; ` # ` starts a note; and `...` stands for entries left out. Pass `iconResolver` from comark-icon's `createIcons()` to draw each file's icon; without it, entries get plain glyphs and nothing is fetched.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a Markdown list instead of a fence (a list turns `__init__.py` bold and drops `[id].vue`), content beside the fence, and an empty block. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-file-tree/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-file-tree/vue` |
| `@comark/react` | `comark-file-tree/react` |
| `@comark/svelte` | `comark-file-tree/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-file-tree/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--accent` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the spacing that draws the tree: the margins, padding, and bullets of its lists, `details`, and `summary` are `!important`, because a page's own list styles are almost always unlayered and would push entries off their guide lines. Override those with `!important` too.
