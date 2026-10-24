# comark-metrics

[![npm version](https://npmx.dev/api/registry/badge/version/comark-metrics)](https://npmx.dev/package/comark-metrics)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-metrics)](https://npmx.dev/package/comark-metrics)
[![install size](https://npmx.dev/api/registry/badge/size/comark-metrics)](https://npmx.dev/package/comark-metrics)
[![license](https://npmx.dev/api/registry/badge/license/comark-metrics)](https://npmx.dev/package/comark-metrics)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/metrics/)

Before → after numbers with the percent change, colored by whether lower or higher is better; progress bars; and tables of metrics with a change column. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-metrics
```

```ts
import { createHtmlRenderer } from "@comark/html";
import metrics, { components } from "comark-metrics/html";

const render = createHtmlRenderer({ plugins: [metrics()], components });
```

```md
The bundle went :delta{from=412 to=388 unit="kB" better="lower"} and :progress{value=0.85 label="Migrated"} of the tests moved.

::stats{better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
::
```

`:delta` shows `412 kB → 388 kB ↓ 5.8%`, green when the change is better and red when it's worse. `:progress` is a native `<progress>` with its percent; `max` counts to something other than 1. `::stats` wraps a table of names, befores, and afters and adds a Change column. Everything is worked out while parsing, so the output needs no script.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a number it can't read, a `better` that isn't `lower` or `higher`, a `value` outside its range, a `::stats` without a three-column table, and a row in two units. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-metrics/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-metrics/vue` |
| `@comark/react` | `comark-metrics/react` |
| `@comark/svelte` | `comark-metrics/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-metrics/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
