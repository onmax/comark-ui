---
title: Metrics
description: Before and after numbers, progress, and tables of metrics, written in Markdown.
keywords: KPI, stats, statistics, numbers, delta, change, percent, progress bar, performance, benchmark, bundle size, comparison table
tagline: Deltas, progress bars, and tables of before and after numbers, with the change worked out while parsing.
group: Review blocks
icon: trending-down
blurb: Deltas, progress, stats, and tiles
credits: 'After <a href="https://quarto.org/docs/dashboards/data-display.html#value-boxes">Quarto</a>''s value boxes, <a href="https://docs.evidence.dev/components/data/delta">Evidence</a>''s delta, and <a href="https://facelessuser.github.io/pymdown-extensions/extensions/progressbar/">PyMdown</a>''s progress bars.'
---

::examples
:::example{label="Delta"}
```md
Moving the pigeon map to a worker cut the main bundle :delta{from=412 to=388 unit="kB" better="lower"} and the time to first sighting :delta{from=2.4 to=1.9 unit="s" better="lower"} on a mid-range phone
```
:::

:::example{label="Stats"}
```md
::stats{better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
| Requests | 38 | 41 |
::
```
:::

:::example{label="Tiles"}
```md
::stats{tiles better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
| Requests | 38 | 41 |
::
```
:::

:::example{label="Progress"}
```md
Duck tests moved to Vitest: :progress{value=0.85 label="Migrated"}
```
:::
::

## Features

- `:delta` turns two numbers into the arrow, the percent change, and whether the change is better or worse.
- `:progress` draws a progress bar with its percent after it.
- `::stats` adds a Change column to a table of befores and afters, or shows each row as a tile.
- The plugin works out every change while parsing, so the renderers only draw it and the output needs no script.
- The numbers sit next to the claim, which is how a pull request that changes a size or a speed reads best.

## Usage

Write `:delta` with the number before and the number after.

::example
```md
The main bundle went :delta{from=412 to=388 unit="kB" better="lower"}
```
::

### Delta

`:delta` shows `412 kB → 388 kB ↓ 5.8%`. The change is a percent of `from`.

#### Before and after

Use the `from` and `to` props to set the numbers. Both are required.

::example
```md
:delta{from=412 to=388}
```
::

When `from` is 0 there is no percent, so the delta shows the difference instead, such as `↑ 1.5 s`. When both are equal, it shows `= 0%`.

#### Unit

Use the `unit` prop to write a unit after both numbers, such as `kB`, `s`, or `%`.

::example
```md
:delta{from=2.4 to=1.9 unit="s"}
```
::

#### Better or worse

Use the `better` prop to color the change: green when it's better, red when it's worse. Write `lower` for sizes and durations, and `higher` for scores.

::example
```md
Bundle :delta{from=412 to=388 unit="kB" better="lower"}, score :delta{from=91 to=88 better="higher"}
```
::

Without `better`, the change is gray.

### Progress

`:progress` is a native `<progress>` with its percent after it. A raw `<progress>` in the Markdown stays as written.

#### Value

Use the `value` prop to fill the bar. It's a fraction from 0 to 1. It's required.

::example
```md
:progress{value=0.85}
```
::

> [!NOTE]
> A `value` outside 0 to `max` is clamped to the bar and reported.

#### Maximum

Use the `max` prop to count up to a number other than 1.

::example
```md
:progress{value=17 max=20}
```
::

#### Label

Use the `label` prop to show a label before the bar. It also names the bar for screen readers.

::example
```md
:progress{value=0.85 label="Migrated"}
```
::

### Stats

`::stats` wraps a table of three columns: a name, the value before, and the value after. The plugin adds a Change column with each row's arrow and percent, and aligns the numbers. Name the headers what you like.

::example
```md
::stats
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Requests | 38 | 41 |
::
```
::

A cell is a number, with commas if you like, and an optional unit after it.

> [!NOTE]
> Both cells of a row need the same unit.

#### Better for every row

Use the `better` prop to color every row's change, with `lower` or `higher`.

::example
```md
::stats{better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Requests | 38 | 41 |
::
```
::

#### Unit of a difference

Use the `unit` prop to set the unit of a difference from 0, for cells written without one.

::example
```md
::stats{unit="ms"}
| Metric | Before | After |
| --- | --- | --- |
| Blocking time | 0 | 120 |
::
```
::

#### Tiles

Use the `tiles` prop to show each row as a tile. The name sits above the after value, and the change sits below it in a pill. The before value counts toward the change but isn't shown.

::example
```md
::stats{tiles better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
::
```
::

Tiles also take a two-column table when there is no before value. The value can be any text, and it shows without a change:

::example
```md
::stats{tiles}
| Metric | Value |
| --- | --- |
| Tests | 1,204 |
| Status | Passing |
::
```
::

## Examples

### Benchmarks in a pull request

Put the numbers where the claim is. A sentence that says what changed carries a `:delta`, and a table of every measurement goes in `::stats` under it:

```md
Moving the map to a worker cut the main bundle :delta{from=412 to=388 unit="kB" better="lower"} on every page

::stats{better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
::
```

Copy the numbers from the tool's output as it prints them: `1,204` and `2.4 s` both read.

### Where better differs by row

`better` applies to the whole table. When some rows are better lower, such as sizes, and others better higher, such as scores, write two tables, one for each.

## API

### Props

#### Delta props

| Prop | Default | Description |
| --- | --- | --- |
| `from` | — | Required. The number before. |
| `to` | — | Required. The number after. |
| `unit` | — | Written after both numbers, such as `kB`, `s`, or `%`. |
| `better` | — | `lower` for sizes and durations, `higher` for scores. Without it, the change is gray. |

#### Progress props

| Prop | Default | Description |
| --- | --- | --- |
| `value` | — | Required. A fraction from 0 to 1, or a count up to `max`. Clamped to 0 to `max`. |
| `max` | `1` | What `value` counts up to. A number above 0. |
| `label` | — | Shown before the bar, and names it for screen readers. |

#### Stats props

| Prop | Default | Description |
| --- | --- | --- |
| `better` | — | `lower` or `higher`, for every row. |
| `unit` | — | The unit of a difference from 0, for cells written without one. |
| `tiles` | `false` | Shows each row as a tile. Takes a table of two or three columns. |

### Options

The plugin takes no options. `metrics: false` in `comarkUi()` turns it off.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A missing or unreadable number.
- A `better` that isn't `lower` or `higher`.
- A `max` that isn't a number above 0.
- A `value` outside 0 to `max`.
- A `::stats` without a table, or with content besides its table, which is dropped.
- A table with other than three columns, or two or three with `tiles`, and a row with the wrong number of cells.
- A row whose cells aren't numbers, or are in different units.
- A prop a block doesn't read.

Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`:progress` 1: `value=85` is outside 0 to 1, so the bar was clamped. Write a fraction such as `value=0.85`, or set `max=100`.
`::stats` 1, row "Size": before is in MB and after in kB. Write both in the same unit.
```

### Package

comark-ui brings `comark-metrics` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-metrics
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import metrics, { components } from "comark-metrics/html";

const render = createHtmlRenderer({ plugins: [metrics()], components });
```

The renderer inlines the styles once per document, and the output needs no script. For Vue, React, or Svelte, import from `comark-metrics/vue`, `comark-metrics/react`, or `comark-metrics/svelte`. The components add the styles when they mount. Import `comark-metrics/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A delta's change is green when it's better, red when it's worse, and muted when there's no verdict. A progress bar follows shadcn/ui's Progress: the primary color on a track of itself. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

Deltas, bars, and tables read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Tile values and the progress bar, when the page has no `--primary` |
| `--comark-muted` | The value before, a change with no verdict, a bar's label and percent, a tile's name |
| `--comark-font` | Inherited text, with tabular numbers |
| `--comark-border` | Tile borders |
| `--comark-background` | Tile backgrounds |
| `--comark-radius` | Tile corner radius |

### Variables

| Variable | Default | Used for |
| --- | --- | --- |
| `--cmt-better` | `--comark-success` | A change that's better |
| `--cmt-worse` | `--comark-danger` | A change that's worse |
| `--cmt-bar` | shadcn/ui's `--primary`, else `--comark-foreground` | The progress bar's fill, and its track at 20% |

Set `--cmt-better` and `--cmt-worse` on `.cmt-delta`, and `--cmt-bar` on `.cmt-progress`.

### Classes

| Class | Element |
| --- | --- |
| `.cmt-delta` | A delta, with `data-direction` (`up`, `down`, `same`) and `data-verdict` (`better`, `worse`, `neutral`) |
| `.cmt-from`, `.cmt-to`, `.cmt-change` | Its value before, after, and the arrow with the percent |
| `.cmt-progress` | A progress bar, with `.cmt-label` before it and `.cmt-percent` after |
| `.cmt-stats` | A `::stats` table |
| `.cmt-tiles` | The grid rendered by `::stats{tiles}` |
| `.cmt-tile` | One stat tile, containing its name, value, and optional change |
| `.cmt-value` | The large value inside a tile |
