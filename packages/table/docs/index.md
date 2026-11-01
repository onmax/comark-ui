---
title: Table
description: Tables from CSV, TSV, and JSON, read while parsing, that copy and sort.
keywords: CSV, TSV, JSON, data table, sortable table, sort, spreadsheet, Excel, copy table, datagrid
tagline: A table read from CSV, TSV, or JSON while parsing, with buttons that copy it and headers that sort.
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

## Features

- A ` ```csv ` or ` ```tsv ` fence becomes a table wherever it is.
- `::table` reads a CSV, TSV, or JSON file or fence while parsing, so the table is plain HTML.
- Every table gets a Copy button that pastes as cells in a spreadsheet, a menu that copies it as Markdown or CSV, and headers that sort.
- A small script adds the buttons and sorting. Without it, headers are plain text, and print hides the buttons.
- Any table, Markdown or data, can color a cell or a row by its status.

## Usage

Paste CSV into a ` ```csv ` fence. The first row is the header.

::example
````md
```csv
Bird,Seen,Pond
Mallard,14,North
Heron,2,North
```
````
::

### File

Use the `src` prop to read a CSV, TSV, or JSON file. The extension picks the format.

```md
::table{src="bench/results.csv"}
::
```

`src` is a path relative to the document's folder, or to `root` when it starts with `/`.

> [!NOTE]
> `src` can't leave `root` or be a URL. In `comarkUi()`, a table reads no files until you pass [options](#options).

### Format

Use the `format` prop to set the format when the extension or the fence doesn't say: `csv`, `tsv`, or `json`.

```md
::table{src="bench/results.txt" format="csv"}
::
```

### JSON

Put a ` ```json ` fence inside `::table` to make it a table. A bare JSON fence stays code, since most JSON in a document is an example.

::example
````md
::table
```json
[{ "bird": "Mallard", "seen": 14 }, { "bird": "Heron", "seen": 2 }]
```
::
````
::

### Markdown tables

Put a Markdown table inside `::table` to give it the copy buttons and `sort`.

::example
```md
::table{sort}
| Bird | Seen |
| --- | --: |
| Mallard | 14 |
| Heron | 2 |
::
```
::

### Sort

Use the `sort` prop to make every header a button that sorts the rows, up then down. Numbers sort as numbers.

::example
````md
::table{sort}
```csv
Bird,Seen
Mallard,14
Pigeon,212
Heron,2
```
::
````
::

> [!NOTE]
> A bare ` ```csv ` or ` ```tsv ` fence never sorts. Put it inside `::table{sort}`.

### Copy

The Copy button writes HTML and tab-separated text, so Google Sheets, Excel, Notion, and Docs paste the table as cells. The arrow beside it opens a menu for Markdown, which renders on GitHub, and CSV. Use `copy=false` to hide them.

::example
````md
::table{copy=false}
```csv
Bird,Seen
Mallard,14
Heron,2
```
::
````
::

### Tone

Use the `tone` prop on a span that fills a cell, as `[text]{tone="success"}`, to tint the cell. The tones are `success`, `warning`, `error`, and `info`. A tone on the first cell colors the whole row, except cells with a tone of their own.

::example
```md
| Check | Time | Result |
| --- | --: | --- |
| [Unit tests]{tone="success"} | 1.9 s | 412 passed |
| E2E | [48 s]{tone="warning"} | 3 slow |
```
::

A CSV, TSV, or JSON cell takes the same span.

> [!NOTE]
> A tone span must fill its cell. A partial span or an unknown tone leaves the cell uncolored and adds an issue.

## Examples

### Benchmarks in a pull request

Have the benchmark write CSV next to the document and point a table at it, so the review shows the numbers the run produced:

```md
::table{src="./bench/results.csv" sort}
::
```

### Big tables

Every row becomes HTML, so thousands of rows make a heavy page. Trim the data to the rows a reader needs. A table wider than the page scrolls sideways in its frame.

### Reading files

The plugin reads files like [comark-include](/include/), from disk under `root` or through your `read`. It refuses symlinks that lead out of `root` and doesn't fetch URLs, so download the data first.

## Accessibility

A sortable header is a button inside its `th`, which gets `aria-sort` once sorted. The Copy button is named "Copy table". The arrow beside it, "More ways to copy", opens a `menu` with two `menuitem`s, Markdown and CSV. A status line announces "Copied as table", "Copied as Markdown", "Copied as CSV", or "Couldn't copy here".

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab`, `Shift+Tab` | Moves between the copy buttons and the sortable headers, and closes an open menu. |
| `Enter`, `Space` | On a sortable header, sorts the rows up, then down. On Copy or a menu item, copies the table. On the arrow, opens the menu. |
| `ArrowDown` | On the arrow, opens the menu. In the menu, moves to the next item. |
| `ArrowUp` | In the menu, moves to the previous item. |
| `Home`, `End` | In the menu, moves to the first or last item. |
| `Escape` | Closes the menu and returns to the arrow. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `src` | — | A CSV, TSV, or JSON file to read, relative to the document's folder, or to `root` when it starts with `/`. |
| `format` | — | `csv`, `tsv`, or `json`, when the extension or the fence doesn't say. |
| `sort` | `false` | Makes every header a button that sorts the rows, up then down. Numbers sort as numbers. |
| `copy` | `true` | `false` hides the Copy button and its menu. |
| `tone` | — | On a span that fills a cell: `success`, `warning`, `error`, or `info`. On the first cell, it colors the whole row. |

### Formats

| Format | Reads |
| --- | --- |
| CSV | Comma-separated, as RFC 4180 writes it. A cell in double quotes may hold commas and line breaks, and `""` is a quote. |
| TSV | Tab-separated, with no quoting. |
| JSON | An array of objects, one per row. Every key becomes a column, in the order first seen. A nested value is written as JSON. |

The first row of CSV and TSV is the header. A column of numbers lines up on the right, even with commas and a short unit.

### Options

Pass options under `table` in `comarkUi()`, such as `comarkUi({ table: { root: "docs" } })`, or to `table()` when you use the plugin alone. Until you do, `comarkUi()` reads no table files.

| Option | Default | Description |
| --- | --- | --- |
| `root` | `"."` | The folder `src` can't leave, as in [comark-include](/include/). |
| `base` | `""` | The document's folder under `root`, where relative paths start. |
| `read` | Reads from disk | A function that takes a path under the root and returns the file's text. Pass it in a browser or an edge runtime. |
| `fences` | `true` | `false` keeps ` ```csv ` and ` ```tsv ` fences as code. |

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A file that's missing, outside the root, a URL, unreadable, or in a format it can't read.
- A `base` option that leaves the root.
- JSON that doesn't parse or isn't an array of objects.
- A quote that never closes.
- A row with too few or too many cells.
- A `::table` with nothing in it.
- A tone span that doesn't fill its cell, or a tone it doesn't know.
- A prop it doesn't read.

A fence it can't read stays code. Each issue names its table and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`::table` 1 ("bench.csv"): file not found. It resolved to "guide/bench.csv" under the root; check the path or `base`.
The ```csv fence 1: row 3 has 4 cells, but the header has 3. Give every row one cell per column.
```

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

For Vue, React, or Svelte, import from `comark-table/vue`, `comark-table/react`, or `comark-table/svelte`. The components start the script when they mount. Import `comark-table/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The Copy button and its arrow sit in a bar above the table, styled like shadcn/ui's outline buttons. Sortable headers look like plain headers, with an arrow once the script runs. The rules sit in a `comark` CSS layer, so any plain rule of yours wins, except the reset that keeps a sortable header from taking a page's `button` styles.

### Shared tokens

Tables read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | The copy buttons and the menu |
| `--comark-foreground` | A hovered copy button's text, the menu's items |
| `--comark-muted` | The copy buttons' icons, the menu's hints, the status after a copy, an unsorted header's arrow |
| `--comark-border` | The copy buttons' and the menu's outline |
| `--comark-accent` | A hovered copy button or menu item, the arrow while its menu is open |
| `--comark-ring` | Focus rings |
| `--comark-radius` | The copy buttons' and the menu's corners |
| `--comark-shadow` | The menu |
| `--comark-font` | The bar |

The table itself takes the page's own table styles.

### Tones

A toned cell gets its color at 20%. Set the shared status tokens in your theme to match the rest of the page:

| Variable | Used for |
| --- | --- |
| `--comark-success` | `success` |
| `--comark-warning` | `warning` |
| `--comark-danger` | `error` |
| `--comark-info` | `info` |

### Classes

| Class | Element |
| --- | --- |
| `.ctb` | The block around a table |
| `.ctb-bar` | The bar above it, with `.ctb-status` and `.ctb-copy` |
| `.ctb-copy` | The Copy button, `.ctb-copy-main`, the arrow, `.ctb-copy-more`, and the menu, `.ctb-menu`, whose items are `button[data-table-copy]` |
| `.ctb-scroll` | The frame the table scrolls in |
| `.ctb-sort` | A sortable header's button, whose `th` gets `aria-sort` once sorted |
