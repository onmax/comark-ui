# comark-charts

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-charts&icon=npm)](https://npmx.dev/package/comark-charts)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-charts&period=month&icon=npm)](https://npmx.dev/package/comark-charts)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-charts)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/charts/)

Charts from a Markdown table, drawn to SVG while parsing, that copy as a PNG or as data. The table stays under the chart, so people see the chart and agents read the numbers. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark @comark/html comark-charts
```

```ts
import { createHtmlRenderer } from "@comark/html";
import charts, { components } from "comark-charts/html";

const render = createHtmlRenderer({ plugins: [charts()], components });
```

```md
::chart{type="line" title="Coffee cups and commits, per month (r = 0.99)"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
| 2026-05 | 890 | 640 |
| 2026-06 | 905 | 652 |
::
```

Put one table between `::chart` and `::`: a header row, then one row per point. The first column is x, and every other column is a series of numbers, named by its header.

| Prop | What it does |
| --- | --- |
| `type` | `bar`, `stacked`, `line`, `area`, `scatter`, `dumbbell`, `waterfall`, `pie`, `gantt`, or `sankey`. Default `bar`. |
| `x` | The column along the x axis. Default the first. |
| `y` | The columns to draw, separated by commas. Default every column but `x`. |
| `title` | The chart's caption, and its name for screen readers. |
| `labels` | Prints the numbers on the chart's bars, steps, or dots. Takes no value. |
| `horizontal` | Turns bars sideways, for long names such as file paths. Takes no value. |

Mark a value with a [comark-annotate](https://comark-ui.onmax.me/annotate/) annotation after the table: `at` names the row by its x value and `series` its column, and the renderer draws the mark around the bar, point, or slice.

```md
:::annotation{at="2026-05" series="commits" mark="circle" color="green"}
The espresso machine arrives.
:::
```

For any other chart, put a [Vega-Lite](https://vega.github.io/vega-lite/) spec after the table in a `vega-lite` block; the table is its data. The [docs](https://comark-ui.onmax.me/charts/#usage) show the table each type expects.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it. Each issue names its chart and says how to fix it.

## How it renders

[Flint](https://github.com/microsoft/flint-chart) turns the table into a Vega-Lite spec with a house theme, and [Vega](https://vega.github.io) draws it to SVG while parsing, on the server or at build time, so the browser runs no chart code. `comark-charts/vue`, `/react`, and `/svelte` place the same SVG; marks, which come from comark-annotate, show only in `@comark/html`.

The page holds a `figure.cch` with the title, the SVG, and the table folded into **Data**. Text, axes, and grid follow Nuxt UI's or shadcn/ui's variables and the shared `--comark-*` tokens, so charts switch with the page's dark mode. Series take `--comark-chart-1` to `-6`, then Nuxt UI's `--ui-chart-1` to `-6`, then shadcn/ui's `--chart-1` to `-6`. The rules sit in a `comark` CSS layer, so any plain rule of your own wins; see the charts' [Theming page](https://comark-ui.onmax.me/charts/#theme).

Only `@comark/html` has a renderer: Vega draws on the server, and a framework component would ship it to the browser.

The comark-ui agent skill covers charts; install it with `vp dlx skills add onmax/comark-ui`, or bundle it in your own app from `comark-ui/skills/comark-ui/`.
