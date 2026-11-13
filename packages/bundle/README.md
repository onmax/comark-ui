# comark-bundle

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-bundle&icon=npm)](https://npmx.dev/package/comark-bundle)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-bundle&period=month&icon=npm)](https://npmx.dev/package/comark-bundle)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-bundle)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/bundle)

Bundle size before and after a change, read from two builds: what every page loads, and which packages moved. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-bundle
```

```ts
import { createHtmlRenderer } from "@comark/html";
import bundle, { components } from "comark-bundle/html";

const render = createHtmlRenderer({ plugins: [bundle({ root: "." })], components });
```

Point `before` and `after` at two builds of the same app, a build folder or a [Sonda](https://sonda.dev) JSON report:

```md
::bundle{before=".bundle/main" after="dist/assets" title="Replace Moment with Temporal"}
::
```

The block shows what every page loads after the change, with the difference, a bar per build where only the packages that changed have color, and one sentence that says what moved. A treemap of the new build waits behind a `<details>`. `src` shows one build alone. A build folder is measured with gzip -9 and brotli 11 and needs sourcemaps to name packages; a Sonda report reads anywhere, through the `read` option. The page shows the report with no script.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a missing build, a path that leaves `root` or doesn't exist, and a file that is neither a build nor a Sonda report. Each issue names the block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-bundle/html`: the styles are inlined |
| `@comark/vue` | `comark-bundle/vue` |
| `@comark/react` | `comark-bundle/react` |
| `@comark/svelte` | `comark-bundle/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-bundle/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
