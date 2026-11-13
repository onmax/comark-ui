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

Point `before` and `after` at the output folders of two builds of the same app:

```md
::bundle{before=".bundle/main" after="dist/assets" title="Replace Moment with Temporal"}
::
```

The block shows what every page loads after the change, with the difference, and a bar per build where the packages it added are dark and the ones it dropped are hatched, named under the bar. A treemap of the new build waits behind a `<details>`. `src` shows one build alone. Each chunk is measured with gzip -9 and brotli 11, and sourcemaps name the packages. Measuring needs Node. The page shows the report with no script.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a missing build, a path that leaves `root` or doesn't exist, and a path that isn't a build folder. Each issue names the block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-bundle/html`: the styles are inlined |
| `@comark/vue` | `comark-bundle/vue` |
| `@comark/react` | `comark-bundle/react` |
| `@comark/svelte` | `comark-bundle/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-bundle/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
