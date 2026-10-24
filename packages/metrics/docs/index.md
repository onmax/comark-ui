---
title: Metrics
description: Before and after numbers, progress, and tables of metrics, written in Markdown.
keywords: KPI, stats, statistics, numbers, delta, change, percent, progress bar, performance, benchmark, bundle size, comparison table
tagline: Write two numbers and get the arrow, the percent change, and whether it's better or worse. Wrap a table of befores and afters and get its change column, or a tile for each.
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

A pull request that changes a size or a speed reads best with the numbers next to the claim. The plugin works out the change while parsing, so every renderer only draws it, and the output needs no script.

## Usage

### Delta

```md
:delta{from=412 to=388 unit="kB" better="lower"}
```

Shows `412 kB → 388 kB ↓ 5.8%`. The change is green when it's better and red when it's worse.

| Prop | What it does |
| --- | --- |
| `from` | Required. The number before. |
| `to` | Required. The number after. |
| `unit` | Written after both numbers, such as `kB`, `s`, or `%`. |
| `better` | `lower` for sizes and durations, `higher` for scores. Without it, the change is gray. |

The change is a percent of `from`. When `from` is 0 there is no percent, so it shows the difference instead, such as `↑ 1.5 s`.

### Progress

```md
:progress{value=0.85 label="Migrated"}
:progress{value=17 max=20}
```

A native `<progress>` with its percent after it.

| Prop | What it does |
| --- | --- |
| `value` | Required. A fraction from 0 to 1, or a count up to `max`. |
| `max` | What `value` counts up to. Default 1. |
| `label` | Shown before the bar, and names it for screen readers. |

A raw `<progress>` in the Markdown stays as written.

### Stats

```md
::stats{better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Requests | 38 | 41 |
::
```

The table needs three columns: a name, the value before, and the value after. The plugin adds a Change column with each row's arrow and percent, colored by `better`, and aligns the numbers. A cell is a number, with commas if you like, and an optional unit after it; both cells of a row need the same unit. Name the headers what you like.

| Prop | What it does |
| --- | --- |
| `better` | `lower` or `higher`, for every row. |
| `unit` | The unit of a difference from 0, for cells written without one. |

With `tiles`, each row becomes a tile: the name is above the after value, and the change is shown below it in a pill. The before value is used for the change but is not displayed:

```md
::stats{tiles better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
::
```

Tiles also accept a two-column table when there is no before value. The value can be any text and is shown without a change:

```md
::stats{tiles}
| Metric | Value |
| --- | --- |
| Tests | 1,204 |
| Status | Passing |
::
```

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a missing or unreadable number, a `better` that isn't `lower` or `higher`, a `value` outside 0 to `max`, a `::stats` without a table or with other than three columns (or two or three columns when `tiles` is set), a row whose cells aren't numbers or are in different units, and a prop a block doesn't read. Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`:progress` 1: `value=85` is outside 0 to 1, so the bar was clamped. Write a fraction such as `value=0.85`, or set `max=100`.
`::stats` 1, row "Size": before is in MB and after in kB. Write both in the same unit.
```

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

The plugin takes no options. `metrics: false` in `comarkUi()` turns it off.

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

The renderer inlines the styles once per document, and the output needs no script. For Vue, React, or Svelte, import from `comark-metrics/vue`, `comark-metrics/react`, or `comark-metrics/svelte`; the components add the styles when they mount. Import `comark-metrics/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A delta's change is green when it's better, red when it's worse, and muted when there's no verdict. A progress bar follows shadcn/ui's Progress: the primary color on a track of itself. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

Deltas, bars, and tables read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Tile values and the progress bar, when the page has no `--primary` |
| `--comark-muted` | The value before, a change with no verdict, a bar's label and percent |
| `--comark-font` | Inherited text, with tabular numbers |
| `--comark-border` | Tile borders |
| `--comark-background` | Tile backgrounds |
| `--comark-radius` | Tile corner radius |

### Variables

| Variable | Default | Used for |
| --- | --- | --- |
| `--cmt-better` | `#259f56`, `#59d38c` in dark mode | A change that's better |
| `--cmt-worse` | shadcn/ui's `--destructive`, else `#ee3533`, `#fd736d` in dark mode | A change that's worse |
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
