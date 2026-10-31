# comark-steps

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-steps&icon=npm)](https://npmx.dev/package/comark-steps)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-steps&period=month&icon=npm)](https://npmx.dev/package/comark-steps)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-steps)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/steps/)

Numbered steps from the headings of a tutorial, or from a numbered list, in Nuxt UI's `::steps` syntax. The numbers are a CSS counter, so there's no script. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-steps
```

```ts
import { createHtmlRenderer } from "@comark/html";
import steps, { components } from "comark-steps/html";

const render = createHtmlRenderer({ plugins: [steps()], components });
```

````md
::steps
### Install
```sh
pnpm add comark-steps
```

### Register
Pass `steps()` to the parser.
::
````

Each `###` heading starts a step that holds everything up to the next one; `level="2"` starts them at `##` instead. The heading keeps its `id`, so anchors and the table of contents still work. A block holding only a numbered list makes a step of each item, from the list's `start`.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: content before the first heading, a block with no headings at its `level`, and a `level` outside 2 to 6. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-steps/html`: the styles are inlined |
| `@comark/vue` | `comark-steps/vue` |
| `@comark/react` | `comark-steps/react` |
| `@comark/svelte` | `comark-steps/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-steps/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--accent` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins.
