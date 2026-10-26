# Charts

comark-charts draws the Markdown table inside `::chart` as an SVG chart and keeps the table under it. People see the chart, and anyone reading the Markdown or the page, an agent included, reads the numbers from the table. So the table is the source of truth: write the real numbers, and name every column so its header labels the chart.

## Write the table

```md
::chart{type="line" title="Coffee cups and commits, per month (r = 0.99)"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
| 2026-05 | 890 | 640 |
::
```

- The first column is x: one row per bar, point, or step. Every other column is a series of numbers, named by its header.
- Cells hold plain numbers, like `1200` or `1,200`. Put the unit in the header or the title, like `size (kB)` or `Build time (ms)`. A cell that isn't a number is left out and reported.
- Dates on x read as time when they look like `2026`, `2026-04`, `2026-04-15`, or an ISO date and time.
- Inside the block, the table comes first, then any marks or Vega-Lite spec. Write explanations above or below the block.

Props, all optional: `type` (below, default `bar` whatever the table holds, so write `type="line"` for a trend), `x` (the x column, default the first), `y` (the columns to draw, comma-separated, default all the others), `title` (the caption and the chart's name for screen readers), `labels` (prints the numbers on bars, waterfall steps, dumbbell rows, sankey nodes, and gantt bars, as in `::chart{type="stacked" labels}`; without it the axis and the data table carry them), and `horizontal` (turns `bar` and `stacked` bars sideways, for long names such as file paths; past 40 bars they turn on their own). Give every chart a `title` that says what it measures and in what unit. Two or more series always get a legend over the plot.

## Choose the type

| Data | `type` | Table |
| --- | --- | --- |
| One number per name, such as size per package | `bar` (default) | names, then one column; add `horizontal` for long names |
| Several numbers per name, compared side by side | `bar` | names, then one column per series |
| Parts that add up to a total per name | `stacked` | names, then one column per part |
| A trend over time | `line` | dates, then one column per series |
| Totals over time that add up | `area` | dates, then one column per part |
| One measure against another | `scatter` | numbers, then one column per series |
| Before and after for several metrics | `dumbbell` | metric names, then a `before` and an `after` column |
| How changes add up to a total | `waterfall` | the start total, each change (negative for a drop), then the end total, which must be the start plus every change, in one column |
| Shares of one whole, five or fewer | `pie` | names, then one column of non-negative numbers |
| Steps or tasks over time, such as a build trace, a deploy, or a plan | `gantt` | the task, then a start and an end column, as numbers or dates; a column of names, such as a run or a phase, colors the bars |
| Where an amount goes, such as a budget, a cashflow, or a bundle's bytes | `sankey` | where each flow comes from, where it goes, and how much; a flow can't loop back, and a node in the middle can't send out more than it takes in |

When none of these fit, such as a box plot or a heatmap, put a Vega-Lite spec after the table in a fenced `vega-lite` block. The table is its data, so leave `data` out of the spec and name the table's headers as fields; marks don't apply.

In a `gantt`, each row is one bar in table order, and a row that ends where it starts is a milestone, drawn as a diamond. Write dates as `2026-04-15` or `2026-04-15T09:30`; a time without a zone is UTC. To compare runs, add a column naming the run and repeat the steps in each.

For a before and after of one or two metrics, grouped `bar` reads best; past three, use `dumbbell`. Keep the rows in the order the reader should read them: charts draw them in table order.

## Mark what matters

Point at the value the text talks about with an `::annotation` inside the chart, after the table. `at` is the row's x value copied from the table (on a `sankey`, the node's name), and `series` picks one column in that row, or on a `gantt`, the group of the bar when a task repeats. `mark`, `color`, and `side` are under Marks in SKILL.md.

```md
::chart{type="line" title="Coffee cups and commits, per month"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-06 | 940 | 660 |
| 2026-07 | 1,010 | 720 |
:::annotation{at="2026-07" series="commits" mark="circle" color="green"}
The new espresso machine arrives, and commits pass 700.
:::
::
```

For a target, budget, or limit, draw a line across the plot: `mark="line"` with `value`, a number on the value axis, and no `at`. The axis grows to reach it.

```md
:::annotation{mark="line" value="200" color="red" side="right"}
The 200 ms budget.
:::
```

`mark`, `color`, and `side` work as on screenshots: red for a problem, green for a fix, and `side="top"` with `mark="none"` for the one point that matters most. The renderer finds the bar, point, or slice and draws the mark around it, so there is nothing to measure. Keep it to two or three marks a chart.

## Preview

The linter names each chart by its position, such as `` `::chart` 2 ``. No command renders a chart on its own. When you can render the document, with the app that publishes it or the renderer under Install in SKILL.md, open it and confirm the chart says what your text says: the right type, every series named, and the numbers in the expected order.

## Register

- In `comark-ui`: on. Marks on charts show only through `comark-ui/html`.
- Alone: `pnpm add comark @comark/html comark-charts`, then `createHtmlRenderer({ plugins: [charts()], components })` with both from `comark-charts/html`. Flint and Vega draw each chart while parsing, so the browser runs no chart code. `comark-charts/vue`, `/react`, and `/svelte` place the same SVG without its marks. `charts({ draw: false })` only checks the charts, which suits a lint step.
