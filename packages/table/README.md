# comark-table

[![npm version](https://npmx.dev/api/registry/badge/version/comark-table)](https://npmx.dev/package/comark-table)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-table)](https://npmx.dev/package/comark-table)
[![install size](https://npmx.dev/api/registry/badge/size/comark-table)](https://npmx.dev/package/comark-table)
[![license](https://npmx.dev/api/registry/badge/license/comark-table)](https://npmx.dev/package/comark-table)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/table/)

Tables from CSV, TSV, and JSON files or fences, read while parsing, with Copy CSV and Copy Markdown buttons and headers that sort. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-table
```

```ts
import { createHtmlRenderer } from "@comark/html";
import table, { components } from "comark-table/html";

const render = createHtmlRenderer({ plugins: [table({ root: "docs" })], components });
```

````md
::table{src="bench/results.csv" sort}
::

```csv
Benchmark,Before (ms),After (ms)
Parse,"1,204",980
```

::table
```json
[{ "package": "zoom", "kB": 3.1 }, { "package": "tabs", "kB": 2.4 }]
```
::
````

`src` reads a file relative to the document, under `root`, as comark-include does; pass `read` in a browser or an edge runtime. A ` ```csv ` or ` ```tsv ` fence becomes a table anywhere (`fences: false` keeps them as code); a ` ```json ` fence, an array of objects, becomes one inside `::table`, and so does a Markdown table. `sort` makes the headers sort the rows, and `copy=false` hides the copy buttons. Number columns line up on the right.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a missing file, a path outside the root, a URL, an unknown format, JSON that isn't an array of objects, an unclosed quote, and rows of the wrong length. A fence it can't read stays code. Each issue names its table and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-table/html`: the script and styles are inlined once per document |
| `@comark/vue` | `comark-table/vue` |
| `@comark/react` | `comark-table/react` |
| `@comark/svelte` | `comark-table/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components start the script when they mount; import `comark-table/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
