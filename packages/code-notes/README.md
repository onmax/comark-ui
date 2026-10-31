# comark-code-notes

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-code-notes&icon=npm)](https://npmx.dev/package/comark-code-notes)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-code-notes&period=month&icon=npm)](https://npmx.dev/package/comark-code-notes)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-code-notes)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/code-notes/)

Numbered notes on lines of code, as in Quarto and AsciiDoc: a `// <1>` comment at the end of a line becomes a marker, and the numbered list after the fence becomes its notes, each linked to its marker and back. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-code-notes
```

```ts
import { createHtmlRenderer } from "@comark/html";
import shiki from "@comark/html/plugins/shiki";
import codeNotes, { components } from "comark-code-notes/html";

const render = createHtmlRenderer({ plugins: [shiki(), codeNotes()], components });
```

````md
```ts
const res = await fetch(url) // <1>
if (!res.ok) return 0 // <2>
```

1. One request per plaza, so the counts load in parallel.
2. A plaza with no census yet counts as empty.
````

Markers sit in a line-end comment: `// <1>`, `# <1>`, `-- <1>`, `; <1>`, `/* <1> */`, or `<!-- <1> -->`. They are taken out before Shiki highlights the code and drawn into its lines after, so put `codeNotes()` after `shiki()`. The marker's number is CSS, so copying the code, by hand or with comark-code's button, leaves it out. A fence with no numbered list after it, and any ` ```md ` fence, stays as written.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: markers with no list, a marker with no note, a note with no marker, and `shiki` after the plugin. Each issue names its fence and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-code-notes/html`: the styles are inlined |
| `@comark/vue` | `comark-code-notes/vue` |
| `@comark/react` | `comark-code-notes/react` |
| `@comark/svelte` | `comark-code-notes/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-code-notes/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
