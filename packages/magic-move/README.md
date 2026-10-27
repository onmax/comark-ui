# comark-magic-move

[![npm version](https://npmx.dev/api/registry/badge/version/comark-magic-move)](https://npmx.dev/package/comark-magic-move)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-magic-move)](https://npmx.dev/package/comark-magic-move)
[![install size](https://npmx.dev/api/registry/badge/size/comark-magic-move)](https://npmx.dev/package/comark-magic-move)
[![license](https://npmx.dev/api/registry/badge/license/comark-magic-move)](https://npmx.dev/package/comark-magic-move)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/magic-move/)

Code that animates between steps, written in Markdown. Every code block inside `::magic-move` is one step with a tab of its own, like a code group. Opening a tab moves the words and marks two steps share to their new places, and the rest fade, as in [Shiki Magic Move](https://antfu.me/posts/shiki-magic-move). The script reads the rendered code, so it works with any highlighter or none. Without it, the steps read one after another. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-magic-move
```

```ts
import { createHtmlRenderer } from "@comark/html";
import magicMove, { components } from "comark-magic-move/html";

const render = createHtmlRenderer({ plugins: [magicMove()], components });
```

The label after a fence's language names its step:

````md
::magic-move{title="Extract the rate"}
```ts [Start]
const total = price * 2
```

```ts [Extract the rate]
const rate = 2
const total = price * rate
```
::
````

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a block with fewer than two code blocks, content that isn't a code block (it's dropped), and a prop it doesn't know. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-magic-move/html`: the script and styles are inlined once per document |
| `@comark/vue` | `comark-magic-move/vue` |
| `@comark/react` | `comark-magic-move/react` |
| `@comark/svelte` | `comark-magic-move/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`.

The tabs follow the shared `--comark-*` tokens; see [Theming](https://comark-ui.onmax.me/guide/theming/). Set `--cmv-surface` and `--cmv-gap` for the header behind the tabs and the space between steps without the script.
