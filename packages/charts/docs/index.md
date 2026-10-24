---
title: Charts
description: Charts from a Markdown table, drawn to SVG with no script.
keywords: graph, plot, bar chart, line chart, pie chart, scatter plot, area chart, benchmark, data visualization, dataviz, Vega
tagline: Write a table and get a chart drawn to SVG, with no script. The table stays under it, so people see the chart and agents read the numbers.
group: Review blocks
icon: chart-column
blurb: Charts from a Markdown table
credits: 'Laid out by Microsoft Research''s <a href="https://github.com/microsoft/flint-chart">Flint</a> on its New York Times theme, and drawn by <a href="https://vega.github.io">Vega</a>.'
---

::examples
:::example{label="Bars"}
```md
::chart{title="Pigeons on the roof, by weekday"}
| weekday | pigeons (average) |
| --- | --: |
| Monday | 3.2 |
| Tuesday | 4.1 |
| Wednesday | 2.8 |
| Thursday | 6.5 |
| Friday | 14.7 |
::
```
:::

:::example{label="Lines"}
```md
::chart{title="Coffee cups and commits, per month (r = 0.99)"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
| 2026-05 | 890 | 640 |
| 2026-06 | 905 | 652 |
| 2026-07 | 960 | 715 |
| 2026-08 | 975 | 720 |
| 2026-09 | 1,030 | 768 |
| 2026-10 | 1,025 | 760 |
::
```
:::

:::example{label="With notes"}
```md
::chart{title="Coffee cups and commits, per month (r = 0.99)"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
| 2026-05 | 890 | 640 |
| 2026-06 | 905 | 652 |
| 2026-07 | 960 | 715 |
| 2026-08 | 975 | 720 |
| 2026-09 | 1,030 | 768 |
| 2026-10 | 1,025 | 760 |
::::annotation{at="2026-07" series="commits" mark="circle" color="green"}
The new espresso machine arrives, and commits pass 700.
::::
::::annotation{at="2026-09" series="coffee cups" mark="none" side="top" color="red"}
Peak coffee.
::::
::
```
:::

:::example{label="Before / after"}
```md
::chart{type="dumbbell" title="Minutes lost per week, before and after the rubber ducks"}
| activity | before | after |
| --- | --: | --: |
| waiting for review | 820 | 540 |
| debugging alone | 1,450 | 980 |
| meetings about bugs | 2,100 | 1,320 |
| standup | 380 | 160 |
::
```
:::

:::example{label="Performance"}
```md
::chart{type="dumbbell" title="Largest Contentful Paint per page, before and after lazy-loading the editor (ms)"}
| page | before | after |
| --- | --: | --: |
| home | 2,480 | 1,120 |
| docs | 2,910 | 1,340 |
| blog post | 2,050 | 980 |
| playground | 4,350 | 4,100 |
::::annotation{at="playground" series="after" mark="circle" color="red"}
The playground opens the editor right away, so it stays slow.
::::
::
```
:::

:::example{label="Gantt"}
```md
::chart{type="gantt" title="A Friday deploy, minutes after 16:55"}
| step | start | end |
| --- | --: | --: |
| tests | 0 | 6 |
| build | 6 | 11 |
| deploy | 11 | 13 |
| it's live | 13 | 13 |
| rollback | 21 | 24 |
::
```
:::

:::example{label="Waterfall"}
```md
::chart{type="waterfall" title="Rubber ducks in the office this quarter"}
| step | ducks |
| --- | --: |
| July | 41 |
| bulk order | 12 |
| taken home | -4 |
| behind the radiator | -3 |
| October | 46 |
::
```
:::
::

The chart's source is a plain Markdown table. A person or an agent reading the Markdown reads the numbers, not a chart spec. The page shows the chart with the same table under it, folded into **Data**, so a tool that turns the page into text keeps the numbers too. Without the plugin, the table still renders as a table.

## Usage

```md
::chart{type="line" x="month" y="coffee cups, commits" title="Coffee cups and commits"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
::
```

Put one table between `::chart` and `::`, with a header row, then one row per bar, point, or step. The first column is x, and every other column is a series of numbers, named by its header. Rows are drawn in table order.

| Prop | What it does |
| --- | --- |
| `type` | The chart type, from the table below. Without it, dates on x make a line and anything else makes bars. |
| `x` | The column along the x axis. Default the first. |
| `y` | The columns to draw, separated by commas. Default every column but `x`. |
| `title` | The chart's caption, and its name for screen readers. |
| `labels` | Writes each value on its bar. See [Values on the bars](#values-on-the-bars). |

Cells hold plain numbers, with commas between thousands if you like, such as `1,200`. Put units in the header or the title, such as `size (kB)`.

x values in the form `2026`, `2026-04`, `2026-04-15`, or an ISO date and time sit on a time axis, and numbers sit on a number axis. Bars, steps, and dumbbells are the exception, and give each value its own row.

Marks, gantts, and Vega-Lite specs each have their own page:

- [`annotation`](/charts/components/annotation/) marks a row or one of its values with a note, or draws a line across the chart at a target.
- [`gantt`](/charts/components/gantt/) is the type with its own table: each bar's name, then where it starts and where it ends.
- [`vega-lite`](/charts/components/vega-lite/) draws any chart the types don't cover, from a spec that reads the table.

### Chart types

| `type` | Use it for | Table |
| --- | --- | --- |
| `bar` | One or more numbers per name: sizes, counts, timings. | Names, then one column per series. Several series make grouped bars. |
| `stacked` | Parts that add up to a total per name. | Names, then one column per part. |
| `line` | A trend over time or over a number. | Dates or numbers, then one column per series. Each line is labelled at its end. |
| `area` | Totals over time that add up. | Dates, then one column per part, stacked. |
| `scatter` | One measure against another. | Numbers, then one column per series. |
| `dumbbell` | Before and after for several metrics. | Metric names, then two or more columns, such as `before` and `after`. |
| `waterfall` | How changes add up to a total. | The starting total, then each change, negative for a drop, then the end total, all in one column. |
| `pie` | Shares of one whole. | Names, then one column of numbers that aren't negative. |
| `gantt` | Steps or tasks over time, such as a build, a deploy, or a plan. | One row per bar: its name, then where it starts and where it ends, as numbers or dates. See [`gantt`](/charts/components/gantt/). |

Bars turn sideways when their labels are long or there are many of them, so file paths and test names stay whole.

In a waterfall, the first row is a total, and so is the last when it equals the running sum. The other rows are changes, green up and red down.

::examples
:::example{label="Sideways bars"}
```md
::chart{title="Longest review threads (min)"}
| first comment | minutes |
| --- | --: |
| nit: this file uses tabs and the rest of the repo uses spaces | 84 |
| could we call this something other than data2 | 51 |
| why does the deploy script check for pigeons | 47 |
| is the rubber duck in this screenshot load-bearing | 22 |
::
```
:::

:::example{label="Grouped bars"}
```md
::chart{title="Tabs-vs-spaces arguments per month"}
| team | sunny | rainy |
| --- | --: | --: |
| frontend | 12 | 31 |
| backend | 16 | 40 |
| design | 2 | 9 |
::
```
:::

:::example{label="Stacked bars"}
```md
::chart{type="stacked" labels title="Standup by topic (min)"}
| day | work | weekend | pigeons |
| --- | --: | --: | --: |
| Monday | 4 | 11 | 2 |
| Wednesday | 6 | 1 | 3 |
| Friday | 2 | 14 | 7 |
::
```
:::

:::example{label="Target line"}
```md
::chart{labels title="Minutes to the first review comment"}
| team | minutes |
| --- | --: |
| frontend | 38 |
| backend | 64 |
| design | 12 |
:::annotation{mark="line" value="45" color="red" side="right"}
Team goal: 45 min.
:::
::
```
:::

:::example{label="Area"}
```md
::chart{type="area" title="Emoji reactions in team chat (hundreds)"}
| month | thumbs up | eyes |
| --- | --: | --: |
| 2026-06 | 40 | 20 |
| 2026-07 | 46 | 24 |
| 2026-08 | 52 | 28 |
| 2026-09 | 58 | 32 |
| 2026-10 | 64 | 36 |
::
```
:::

:::example{label="Scatter"}
```md
::chart{type="scatter" title="Failed deploys against pigeons on the roof (r = 0.99)"}
| pigeons | failed deploys | rollbacks |
| --: | --: | --: |
| 2 | 1 | 0 |
| 5 | 3 | 1 |
| 9 | 4 | 2 |
| 14 | 7 | 3 |
| 21 | 9 | 5 |
::
```
:::

:::example{label="Pie"}
```md
::chart{type="pie" title="Why the build failed, according to the team (%)"}
| reason | share |
| --- | --: |
| the pigeons | 58 |
| cat on the keyboard | 24 |
| it's Friday | 12 |
| the code | 6 |
::
```
:::
::

### Values on the bars

```md
::chart{type="stacked" labels title="Standup by topic (min)"}
| day | work | weekend | pigeons |
| --- | --: | --: | --: |
| Monday | 4 | 11 | 2 |
| Friday | 2 | 14 | 7 |
::
```

Without `labels`, bars print their values past their ends when there's room, and crowded bars, stacked bars, and bars with negative numbers print none. With `labels`, every bar and segment writes its value inside itself, in white. A bar too short or too thin for its value writes it just past its end instead. The value axis goes, since every value is on the chart.

A stack has one end, so its first series, drawn at the end, is the only part that writes its value past it. A thinner part elsewhere in the stack, or a value that would cover another bar's, leaves its value to the **Data** table.

`labels` applies to `bar` and `stacked` charts. Other types have no bars to write on, or print their numbers already: a dumbbell its ends, a waterfall each step, and a gantt each duration. The plugin reports it there.

## Examples

### Validation

The plugin checks every chart while parsing and adds the problems to `meta.issues`, so you can reject a document before publishing it:

```ts
import { parseMarkdown } from "comark";
import charts from "comark-charts";

const { meta } = await parseMarkdown(markdown, { plugins: [charts()] });
if (meta.issues.length) throw new Error(meta.issues.join("\n"));
```

Each issue names its chart by its position in the document and says how to fix it:

```txt
`::chart` 2: row 3 has `41 kB` in `size`, which isn't a number. Write the number alone, such as `1200` or `1,200`, and put the unit in the header, such as `size (ms)`.
```

It reports:

- Unknown props and types.
- Columns that `x` or `y` name but the table doesn't have.
- Cells that aren't numbers.
- Tables without rows, or with unnamed or repeated columns.
- An x value that appears twice.
- Content besides the table and its annotations.
- Data that doesn't fit the type, such as a line or an area of one row, a scatter without numbers on x, a dumbbell with one column, a pie or a waterfall with several, and a pie with a negative number or nothing but zeros.

[Marks](/charts/components/annotation/#validation), [gantts](/charts/components/gantt/#validation), and [Vega-Lite specs](/charts/components/vega-lite/#validation) have checks of their own, on their pages.

Rendering never throws. A chart with a problem draws what it can:

- A cell that isn't a number is left out.
- A type that doesn't fit falls back to the default.
- A pie or a waterfall draws only its first column.
- A chart with nothing to draw shows its content as it is.

[comark-linter](/lint/) reports the same issues with their line numbers. Each one has its own rule in [Doctor](/doctor/).

### Size

A chart keeps the size its text was set for instead of stretching to the column, so labels read the same in every chart. It's sized to fit its card, with room for its labels.

- Values sit on the marks when they fit. On crowded or stacked bars, or with negative numbers, you read them off the value axis instead.
- Lines name their series at their ends. When the ends sit close together, a legend names them.
- No row is ever dropped. A long sideways chart grows taller.
- A narrower column scrolls the chart sideways, and print shrinks it to the page. A chart with marks shrinks to fit instead, since its marks sit at percentages of the chart.

### Renderers

The parse plugin draws every chart, so Vega runs where you parse, on the server or at build time, and never in the browser. Each renderer only places the SVG it wrote:

| Renderer | Entry |
| --- | --- |
| `@comark/html` | `comark-charts/html`, which inlines the styles once per document |
| `@comark/vue` | `comark-charts/vue` |
| `@comark/react` | `comark-charts/react` |
| `@comark/svelte` | `comark-charts/svelte` |

The Vue, React, and Svelte components add the styles when they mount. When you render on a server, import `comark-charts/style.css` with your own styles so the page doesn't shift.

Marks come from comark-annotate, which renders only to HTML, so the other renderers draw the chart without them.

Charts are static. They have no tooltips, and the **Data** table holds every number. To check documents without drawing them, as comark-linter does, pass `charts({ draw: false })`.

## API

Options go under `charts` in `comarkUi()`, or to `charts()` when you use it alone. `draw: false` checks every chart without drawing it, as comark-linter does. It defaults to `true`.

### Package

[comark-ui](/getting-started/) brings `comark-charts` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-charts
```

```ts
import { createHtmlRenderer } from "@comark/html";
import charts, { components } from "comark-charts/html";

const render = createHtmlRenderer({ plugins: [charts()], components });
```

[Flint](https://github.com/microsoft/flint-chart) and [Vega](https://vega.github.io) draw each chart while parsing, on the server or at build time, so the browser runs no chart code. The package installs both. Vue, React, and Svelte have renderers too, as [Renderers](#renderers) shows.

The comark-ui agent skill knows the table shape for each chart type and how to check the result. Agents install it with `npx skills add onmax/comark-ui`. Agents read charts without the skill: in the Markdown and in the page, each chart's data is a table.

## Theme

A chart is a card in the style of [shadcn/ui](https://ui.shadcn.com), so it switches with the page's dark mode. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

Charts read these [shared tokens](/guide/theming/), and their series read shadcn/ui's chart colors:

| Token | Falls back to | Used for |
| --- | --- | --- |
| `--comark-foreground` | `--foreground` | Values, the caption, the data table |
| `--comark-muted` | `--muted-foreground` | Axis labels, the **Data** toggle, waterfall totals |
| `--comark-border` | `--border` | The card, grid lines, and the data table's rules |
| `--comark-background` | `--background` | The card, and the edges between slices and around points |
| `--comark-ring` | `--ring` | The focus ring on the **Data** toggle |
| `--comark-radius` | `--radius` | The card's corners |
| `--comark-font` | `--font-sans` | All text |
| `--comark-chart-1` to `-6` | `--chart-1` to `-6` | Series, in column order |

Without either, series use six colors that read on light and dark pages: blue, orange, green, purple, rose, and yellow. A waterfall's increases and decreases are series 3 and 5.

### Variables

| Variable | Default | Used for |
| --- | --- | --- |
| `--cch-padding` | `1.5rem` | The space inside the card's sides. The **Data** footer runs to the card's edges, so it follows. |

Marks on a chart use comark-annotate's styles, and its [variables](/annotate/#variables) for their colors.

### Classes

A chart is a `figure.cch` with `data-type`, such as `data-type="bar"`, holding a `figcaption`, the SVG in `.cch-plot`, and the table in `details.cch-data` as its footer. A chart with marks adds `.cch-marked` to `.cch-plot`.

```css
:root {
  --comark-chart-1: oklch(0.65 0.2 250);
}

.cch {
  --cch-padding: 1rem;
}
```
