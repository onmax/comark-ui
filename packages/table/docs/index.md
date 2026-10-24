---
title: Table
description: Tables from CSV, TSV, and JSON, read while parsing, that copy and sort.
keywords: CSV, TSV, JSON, data table, sortable table, sort, spreadsheet, Excel, copy table, datagrid
tagline: Point a table at a CSV file, or paste the CSV into a fence, and get a table with Copy CSV and Copy Markdown buttons and, if you like, headers that sort.
group: Review blocks
icon: table
blurb: Tables from CSV and JSON
credits: 'After <a href="https://mystmd.org/guide/tables#csv-tables">MyST</a>''s csv-table, <a href="https://docs.gitlab.com/user/markdown/#json-tables">GitLab</a>''s JSON tables, and <a href="https://streamdown.ai">Streamdown</a>''s table copy.'
---

::examples
:::example{label="CSV fence"}
````md
```csv
Benchmark,Before (ms),After (ms)
Parse the duck census,"1,204",980
Render the pond map,88,91
Count the pigeons,412,388
```
````
:::

:::example{label="Sortable"}
````md
::table{sort}
```json
[
  { "bird": "Mallard", "seen": 14, "pond": "North" },
  { "bird": "Pigeon", "seen": 212, "pond": "Plaza" },
  { "bird": "Heron", "seen": 2, "pond": "North" }
]
```
::
````
:::

:::example{label="Colors"}
```md
| Check | Time | Result |
| --- | --: | --- |
| [Unit tests]{tone="success"} | 1.9 s | 412 passed |
| E2E | [48 s]{tone="warning"} | 3 slow |
| [Type check]{tone="error"} | 6.2 s | 2 errors |
```
:::
::

A benchmark or an export reads best as the table it is, and an agent writing a review shouldn't have to turn CSV into Markdown by hand. The plugin reads the file or the fence while parsing, so the table is plain HTML. A small script adds the copy buttons and sorting, and without it the table still reads. Any table, Markdown or data, can color a cell or a row by its status.

## Usage

### Files

```md
::table{src="bench/results.csv" sort}
::
```

`src` is a path relative to the document's folder, or to `root` when it starts with `/`. It can't leave `root` or be a URL. The extension picks the format: `.csv`, `.tsv`, or `.json`; set `format` for a file named otherwise.

### Fences

A ` ```csv ` or ` ```tsv ` fence becomes a table wherever it is. Pass `fences: false` to keep them as code.

A ` ```json ` fence stays code, since most JSON in a document is an example. Put it inside `::table` to make it a table:

````md
::table
```json
[{ "bird": "Mallard", "seen": 14 }, { "bird": "Heron", "seen": 2 }]
```
::
````

`::table` around a Markdown table gives it the copy buttons and `sort`.

### Formats

| Format | Reads |
| --- | --- |
| CSV | Comma-separated, as RFC 4180 writes it: a cell in double quotes may hold commas and line breaks, and `""` is a quote. |
| TSV | Tab-separated, with no quoting. |
| JSON | An array of objects, one per row. Every key becomes a column, in the order first seen; a nested value is written as JSON. |

The first row of CSV and TSV is the header. A column whose cells are all numbers, with commas and a short unit if you like, lines up on the right.

### Props

| Prop | What it does |
| --- | --- |
| `src` | A CSV, TSV, or JSON file to read. |
| `format` | `csv`, `tsv`, or `json`, when the extension or the fence doesn't say. |
| `sort` | Makes every header a button that sorts the rows, up then down. Numbers sort as numbers. |
| `copy` | `copy=false` hides the Copy CSV and Copy Markdown buttons. |
| `tone` | A whole cell can be written as `[text]{tone="success"}` (also `warning`, `error`, or `info`) to tint it. A tone on the first cell colors the whole row; other cells keep their own tone or inherit the row tone. |

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a file that's missing, outside the root, a URL, or in a format it can't read; JSON that doesn't parse or isn't an array of objects; a quote that never closes; a row with too few or too many cells; and a `::table` with nothing in it. A fence it can't read stays code, and a prop it doesn't read is reported too. A tone span must fill its whole cell; partial spans and tones other than `success`, `warning`, `error`, or `info` report issues and leave the cell uncolored. Each issue names its table and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`::table` 1 ("bench.csv"): file not found. It resolved to "guide/bench.csv" under the root; check the path or `base`.
The ```csv fence 1: row 3 has 4 cells, but the header has 3. Give every row one cell per column.
```

### Theme

Tone colors use `--ui-success`, `--ui-warning`, `--ui-error`, and `--ui-info`, with green, amber, red, and blue fallbacks. Override those variables in your theme to match the rest of the page.

## Examples

### Benchmarks in a pull request

Have the benchmark write CSV next to the document, and point a table at it, so the numbers in the review are the ones the run produced:

```md
::table{src="./bench/results.csv" sort}
::
```

### Big tables

Every row becomes HTML, so a table of thousands of rows makes a heavy page. Trim the data to the rows a reader needs before writing it. A table wider than the page scrolls sideways inside its frame.

### Reading files

Files are read while parsing, the way [comark-include](/include/) reads them: from disk under `root` by default, refusing symlinks that lead out of it, or through your `read`. The table doesn't fetch URLs; download the data first.

### Without the script

The copy buttons and the sort arrows only show once the script runs. Without it, the headers read as plain text and the table is still a table. In print, the buttons are hidden.

## API

These options go under `table` in `comarkUi()`, or to `table()` when you use the plugin alone. In `comarkUi()`, a table reads no files until you pass options, such as `comarkUi({ table: { root: "docs" } })`.

`root` is the folder `src` can't leave, and `base` the document's folder under it, as in [comark-include](/include/). In a browser or an edge runtime, pass `read`, a function that takes a path under the root and returns the file's text. `fences: false` keeps ` ```csv ` and ` ```tsv ` fences as code.

### Package

comark-ui brings `comark-table` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-table
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import table, { components } from "comark-table/html";

const render = createHtmlRenderer({ plugins: [table({ root: "docs" })], components });
```

The HTML renderer inlines the script and styles once per document. For Vue, React, or Svelte, import from `comark-table/vue`, `comark-table/react`, or `comark-table/svelte`; the components start the script when they mount. Import `comark-table/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A table scrolls sideways in place, with its copy buttons in a bar above it, in the style of shadcn/ui's outline buttons. Sortable headers read as plain header text, with an arrow once the script runs. The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the reset that keeps a sortable header from taking a page's `button` styles.

### Shared tokens

Tables read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | The copy buttons |
| `--comark-foreground` | A hovered copy button's text |
| `--comark-muted` | The copy buttons' text, the status after a copy, an unsorted header's arrow |
| `--comark-border` | The copy buttons' outline |
| `--comark-accent` | A hovered copy button |
| `--comark-ring` | Focus rings |
| `--comark-radius` | The copy buttons' corners |
| `--comark-font` | The bar |

The table itself takes the page's own table styles.

### Classes

| Class | Element |
| --- | --- |
| `.ctb` | The block around a table |
| `.ctb-bar` | The bar above it, with `.ctb-status` and the `button[data-table-copy]` buttons |
| `.ctb-scroll` | The frame the table scrolls in |
| `.ctb-sort` | A sortable header's button; its `th` carries `aria-sort` once sorted |
