# Blocks

The syntax of each block a data report uses. Which chart answers which question is in [charts.md](charts.md).

## Charts

```md
::chart{type="line" unit="h" log title="Time to first reply" description="The median halved since May."}
| month | median | p90 |
| --- | --: | --: |
| 2026-05 | 2.79 | 11.5 |
| 2026-06 | 2.37 | 7.5 |
::
```

The first column is x; every other column is a series, named by its header. Cells hold plain numbers, with commas between thousands if you like. Dates on x such as `2026`, `2026-05`, or `2026-05-04` sit on a time axis.

| Prop | What it does |
| --- | --- |
| `type` | `bar` (default), `stacked`, `line`, `area`, `scatter`, `dumbbell`, `waterfall`, `pie`, `heatmap`, `gantt`, or `sankey`. |
| `title` | What is measured, per what. Also the chart's name for screen readers. |
| `description` | One sentence under the title: what to see. |
| `unit` | The numbers' unit: `$` prints before them, `%`, `h`, `ms` after. From a thousand up they print short, as `$22.2k`. Gantts and sankeys don't take it. |
| `log` | A log scale: alone for the numbers' axis, `log="x"` for the x column of a line or scatter over numbers, `log="both"`. Lines, scatter plots, and bar charts take it, with every number above 0. |
| `better` | On a heatmap, `higher` or `lower`: cells run red, amber, green. |
| `horizontal` | Sideways bars, for long names or many rows. Written alone. |
| `x`, `y` | The x column, and the series columns separated by commas, when they aren't the first and the rest. |
| `labels` | Bars, stacked bars, and heatmaps print their numbers; `labels=false` turns it off. On waterfalls, dumbbells, gantts, and sankeys, `labels` alone turns it on. |

A line chart of two to eight series names each line at its end, in its color. Every other chart with several series gets a legend over the plot.

## Headline strip

```md
::stats{tiles}
| Figure | Value |
| --- | --- |
| Questions | 418 |
| Answerable today | 80% |
| Median first reply | 1.3 h |
::
```

Two columns: a name and a value, any text. A third column between them is the value before, and the tile shows the change in a pill; add `better="lower"` when a drop is good.

## Folded detail

```md
::details{summary="How the numbers were computed"}
The export holds one row per customer message...
::
```

## Links between sections

Every `##` heading gets an id from its words, so `## Question types` is `#question-types`. Link a finding to its section with `[Question types](#question-types)`, or set the id with `## Question types {#types}`.
