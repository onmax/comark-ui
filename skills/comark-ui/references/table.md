# Tables from CSV, TSV, and JSON

comark-table turns CSV, TSV, or JSON from a fence or a file into a plain HTML table with a Copy button, which pastes as cells in a spreadsheet, and a menu that copies it as Markdown or CSV. With `sort`, its headers sort the rows. Use it for benchmark results, exports, and any data a tool wrote, so the page shows the numbers the run produced.

## Syntax

````md
::table{sort}
```csv
Benchmark,Before (ms),After (ms)
Parse the duck census,"1,204",980
Render the pond map,88,91
```
::
````

Or read the file the run wrote, and leave the block empty:

```md
::table{src="bench/results.csv" sort}
::
```

- A ` ```csv ` or ` ```tsv ` fence turns into a table anywhere, with the Copy button and no sorting. Wrap it in `::table` to set the props below.
- A ` ```json ` fence stays code unless it sits inside `::table`. It holds an array of objects, one per row. Every key becomes a column, in the order first seen, and a nested value shows as JSON.
- `src` starts at the document's folder, or at the host's `root` when it starts with `/`. It can't leave `root` or be a URL, and the extension picks the format. The plugin drops content beside `src` and reports it.
- A Markdown table inside `::table{sort}` or `::table{copy}` gets the Copy button. A `::table` with no props renders its Markdown table plain.
- To tint a cell by status, write the whole cell as `[text]{tone="success"}`, with `success`, `warning`, `error`, or `info`. A tone on the first cell tints the row. This works in Markdown, CSV, TSV, and JSON cells. A span that doesn't fill its cell, or another tone, leaves the cell uncolored and is reported.

| Prop | What it does |
| --- | --- |
| `src` | A `.csv`, `.tsv`, or `.json` file to read. |
| `format` | `csv`, `tsv`, or `json`, for a file or fence whose extension or language doesn't say. |
| `sort` | Makes every header a button that sorts the rows, up then down. Numbers sort as numbers. |
| `copy` | On by default. `copy=false` hides the Copy button and its menu. |

CSV follows RFC 4180. A cell in double quotes may hold commas and line breaks, and `""` is a quote inside one. TSV splits at tabs and has no quoting. The first row is the header, and every row needs one cell per column. A column whose cells are all numbers, with commas or a short unit such as `12 ms`, lines up on the right. A fence the plugin can't read stays code, and the plugin says why.

## Fit the data to the page

- Every row becomes HTML, so trim a large export to the rows the reader needs before you write it. A table wider than the page scrolls sideways in its frame.
- `src` can't fetch a URL. Download the data next to the document, or paste it in a fence.
- To number a table with [xref](xref.md), wrap a Markdown table in `::table{#tbl-name caption="..."}` with no other props. A table that comark-table draws loses its `id`, so comark-xref reports every `:ref` to it.
- To draw the numbers, write a `::chart` around a Markdown table instead, as [charts](charts.md) shows.

## Register

- In `comark-ui`: on. Fences render, and every `src` reports a missing file until you pass `table: { root: "docs" }` or `{ read }`.
- Alone: `pnpm add comark @comark/html comark-table`, then `createHtmlRenderer({ plugins: [table({ root: "docs" })], components })` with both from `comark-table/html`. `root` is the folder `src` can't leave, default `.`, the working directory. `base` is the document's folder under it, where relative paths start. `read(path)` returns a file's text, for browsers and edge runtimes. `fences: false` keeps csv and tsv fences as code. `comark-table/vue`, `/react`, and `/svelte` render it too.
