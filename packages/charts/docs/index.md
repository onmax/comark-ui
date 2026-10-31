---
title: Charts
description: Charts from a Markdown table, drawn to SVG while parsing.
keywords: graph, plot, bar chart, line chart, pie chart, scatter plot, area chart, gantt, timeline, roadmap, schedule, sankey, flow diagram, alluvial, cashflow, box plot, heatmap, benchmark, data visualization, dataviz, Vega, Vega-Lite
tagline: A chart drawn to SVG from a Markdown table, with the table kept under it.
group: Charts and diagrams
icon: chart-column
blurb: Charts from a Markdown table
credits: 'Laid out by Microsoft Research''s <a href="https://github.com/microsoft/flint-chart">Flint</a> on its New York Times theme and by <a href="https://github.com/d3/d3-sankey">d3-sankey</a>, and drawn by <a href="https://vega.github.io">Vega</a>.'
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
::chart{type="line" title="Coffee cups and commits, per month (r = 0.99)"}
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

:::example{label="Sankey"}
```md
::chart{type="sankey" labels title="Where the office snack budget went ($)"}
| from | to | amount |
| --- | --- | --: |
| snack budget | coffee | 410 |
| snack budget | biscuits | 160 |
| snack budget | fruit | 40 |
| biscuits | eaten | 120 |
| biscuits | fed to the pigeons | 40 |
::
```
:::
::

## Features

- The chart's source is a plain Markdown table, so a person or an agent reading the Markdown reads the numbers, not a chart spec.
- The page shows the same table under the chart, folded into **Data**, so a tool that turns the page into text keeps the numbers too.
- Vega draws every chart while parsing, so the browser never loads it.
- A Copy button copies the chart as a PNG, and its menu copies the data as a table for a spreadsheet or as Markdown.
- [Notes](/charts/notes/) mark a row or a value, or draw a line across the chart at a target.
- Ten types cover bars, lines, pies, [gantt charts](#gantt-charts), and [sankeys](#sankey), and a [Vega-Lite spec](#vega-lite) draws anything else, all in the same card, colors, and type.
- Without the plugin, the table still renders as a table.

## Usage

Put one table between `::chart` and `::`, with a header row, then one row per bar, point, or step. The first column is x, and every other column is a series of numbers, named by its header. Rows are drawn in table order.

```md
::chart{type="line" x="month" y="coffee cups, commits" title="Coffee cups and commits"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
::
```

Cells hold plain numbers, with commas between thousands if you like, such as `1,200`. Put units in the header or the title, such as `size (kB)`.

x values in the form `2026`, `2026-04`, `2026-04-15`, or an ISO date and time sit on a time axis, and numbers sit on a number axis. Bars, steps, and dumbbells are the exception, and give each value its own row.

### Type

Use the `type` prop to pick the chart. It defaults to `bar`, whatever the table holds.

| `type` | Use it for | Table |
| --- | --- | --- |
| `bar` | One or more numbers per name: sizes, counts, timings. | Names, then one column per series. Several series make grouped bars. |
| `stacked` | Parts that add up to a total per name. | Names, then one column per part. |
| `line` | A trend over time or over a number. | Dates or numbers, then one column per series. |
| `area` | Totals over time that add up. | Dates, then one column per part, stacked. |
| `scatter` | One measure against another. | Numbers, then one column per series. |
| `dumbbell` | Before and after for several metrics. | Metric names, then two or more columns, such as `before` and `after`. |
| `waterfall` | How changes add up to a total. | The starting total, then each change, negative for a drop, then the end total, all in one column. |
| `pie` | Shares of one whole. | Names, then one column of numbers that aren't negative. |
| `gantt` | Steps or tasks over time, such as a build, a deploy, or a plan. | One row per bar: its name, then where it starts and where it ends, as numbers or dates. See [Gantt charts](#gantt-charts). |
| `sankey` | Where an amount goes: a budget, a cashflow, a bundle's bytes. | One row per flow: where it comes from, where it goes, and how much. See [Sankey](#sankey). |

::examples
:::example{label="Sideways bars"}
```md
::chart{horizontal title="Longest review threads (min)"}
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

In a waterfall, the first row is the start total and the last row the end total. The rows between are changes, green up and red down, and the plugin reports an end total that isn't the start plus every change.

### X axis

Use the `x` prop to pick the column along the x axis. It defaults to the first column.

::example
```md
::chart{x="weekday" title="Pigeons on the roof, by weekday"}
| pigeons (average) | weekday |
| --: | --- |
| 3.2 | Monday |
| 6.5 | Thursday |
| 14.7 | Friday |
::
```
::

### Series

Use the `y` prop to pick the columns to draw, separated by commas. It defaults to every column but `x`. A chart of two or more series names them in a legend over the plot, as a pie names its slices and a gantt its groups.

::example
```md
::chart{type="line" y="commits" title="Commits per month"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
| 2026-05 | 890 | 640 |
| 2026-06 | 905 | 652 |
| 2026-07 | 960 | 715 |
::
```
::

### Title

Use the `title` prop to caption the chart. It's also the chart's name for screen readers.

::example
```md
::chart{title="Rubber ducks bought, by team"}
| team | ducks |
| --- | --: |
| backend | 41 |
| frontend | 18 |
::
```
::

### Horizontal

Use the `horizontal` prop to turn a `bar` or `stacked` chart's bars sideways, so long names such as file paths and test names stay whole. Write it alone, with no value.

::example
```md
::chart{horizontal title="Slowest tests (s)"}
| test | seconds |
| --- | --: |
| e2e/annotate.e2e.ts › copies a zoomed screenshot with its marks | 41.2 |
| packages/lint/test/cli.test.ts › exits with 1 | 12.9 |
| tests/integration/checkout-flow.spec.ts › applies a coupon | 8.4 |
::
```
::

Upright bars wrap a long name onto up to three lines under its bar, and cut it short past that. A chart of more than 40 bars runs sideways without `horizontal`, since an upright plot can't hold them all. Dumbbells and gantts always run sideways, so the plugin reports `horizontal` on them.

### Labels

Use the `labels` prop to print the chart's numbers on it. Write it alone, with no value. Without it, no chart prints its numbers: the value axis and the **Data** table carry them.

::example
```md
::chart{type="stacked" labels title="Standup by topic (min)"}
| day | work | weekend | pigeons |
| --- | --: | --: | --: |
| Monday | 4 | 11 | 2 |
| Friday | 2 | 14 | 7 |
::
```
::

Each type prints its numbers where they belong:

- **Bars and stacked bars** write each value inside its bar or segment, in white, and the value axis goes. A bar too short or too thin for its value writes it just past its end instead. A stack has one end, so only its outermost part writes past it; a thinner part elsewhere, or a value that would cover another bar's, leaves its value to the **Data** table.
- **Waterfalls** print each step's change and each total's value beside it, when the numbers fit their steps.
- **Dumbbells** print each row's least and most values beside its outer dots, when the plot has room for them.
- **Gantts** print how long each bar lasts past its end.
- **Sankeys** print each node's amount under its name.

A `bar` worth zero draws as a thin, faded stroke in its series' color at the base, so a grouped chart keeps a lane for it.

> [!NOTE]
> Lines, areas, scatter plots, and pies have no bars, steps, dots, or nodes to print on, so the plugin reports `labels` on them.

### Gantt charts

Use `type="gantt"` with a table of three columns: the bar's name, where it starts, and where it ends. The chart draws one bar per row, top to bottom in table order. The start and end columns hold numbers or dates.

```md
::chart{type="gantt" title="A Friday deploy, minutes after 16:55"}
| step | start | end |
| --- | --: | --: |
| tests | 0 | 6 |
| build | 6 | 11 |
| deploy | 11 | 13 |
::
```

Use the `y` prop to name the start and end columns when the table has other numbers too, such as a duration: `y="start, end"`.

A column of names, such as a phase, an owner, or a run, colors the bars, one color per name, with a legend over the chart. A task may then repeat in another group, like the same step in two runs. To mark a task that repeats, name its group in the [note](/charts/notes/#series)'s `series`.

> [!NOTE]
> A column of numbers reads as times, so write numbered groups as names, like `shard 1`.

A row that ends where it starts is a milestone, and draws as a diamond. With `labels`, every other bar prints how long it lasts past its end. For numbers that's the difference, and for dates it's a span in the table's unit, such as `3y`, `2mo`, `7d`, or `1.5h`. A gantt has no value axis, so it takes no target line.

Dates take the forms x takes: `2026`, `2026-04`, `2026-04-15`, or an ISO date and time. A time without a zone is UTC, and the axis shows UTC, so the chart reads the same wherever it's drawn.

::example
```md
::chart{type="gantt" labels title="nuxt build, before and after the worker (s)"}
| step | run | start | end |
| --- | --- | --: | --: |
| compile client | before | 0 | 3.7 |
| compile server | before | 3.7 | 7.8 |
| compile client | after | 0 | 3.7 |
| compile server | after | 0.2 | 4.6 |
| ready | after | 4.6 | 4.6 |
::
```
::

### Sankey

Use `type="sankey"` with a table of three columns: where each flow comes from, where it goes, and how much. Each name is a node, drawn as tall as what flows through it, and each row a flow between two nodes, as wide as its amount. Each node takes its place, top to bottom, from the row that first names it, and nodes that only take flows in sit in the last column.

::example
```md
::chart{type="sankey" labels title="Where the bundle's bytes go (kB)"}
| from | to | kB |
| --- | --- | --: |
| main.js | vega | 410 |
| main.js | app | 120 |
| vega | vega-lite | 180 |
| vega | vega-scenegraph | 95 |
| app | charts | 60 |
| app | zoom | 18 |
::
```
::

The first column is where a flow comes from, unless `x` names another. The next column of names is where it goes, and the column of numbers is the amount, unless `y` names one. A flow into a node that ends there takes that node's color, and any other flow its source's.

> [!NOTE]
> A sankey runs one way, so a flow back into a node it came from is reported, and the chart shows its table. Split such a node in two, such as `pond (spring)` and `pond (summer)`.

The plugin also reports a flow of 0 or less, a flow from a node into itself, two rows with the same pair of nodes, and a node in the middle that sends out more than flows into it. A sankey has no value axis, so it takes no target line, and a [note](/charts/notes/) marks a node by its name in `at`.

### Notes

Put an `::annotation` after the table to mark a row or a value with a hand-drawn mark and a note, or to draw a target across the plot. [Notes](/charts/notes/) has their props.

::example
```md
::chart{labels title="Minutes to the first review comment"}
| team | minutes |
| --- | --: |
| frontend | 38 |
| backend | 64 |
| design | 12 |
:::annotation{at="backend" mark="circle" color="red"}
Two reviewers were on leave.
:::
:::annotation{mark="line" value="45" color="red" side="right"}
Team goal: 45 min.
:::
::
```
::

### Vega-Lite

For a chart the types don't cover, such as a box plot, a heatmap, or error bands, put a [Vega-Lite](https://vega.github.io/vega-lite/) spec after the table in a `vega-lite` block. The table is still its data, so it stays in the page: each row becomes one data point, with a field per column named by its header. Cells that read as numbers become numbers, empty ones become null, and the rest stay text.

Leave `data` out of the spec, because the table replaces it, and name the columns in the spec's `encoding`. The spec can't load files or URLs.

::example
````md
::chart{title="Latency per request (ms)"}
| endpoint | ms |
| --- | --: |
| /search | 120 |
| /search | 180 |
| /search | 210 |
| /search | 260 |
| /search | 410 |
| /login | 40 |
| /login | 45 |
| /login | 52 |
| /login | 58 |
| /login | 61 |

```vega-lite
{
  "mark": "boxplot",
  "encoding": {
    "x": { "field": "ms", "type": "quantitative" },
    "y": { "field": "endpoint", "type": "nominal" }
  }
}
```
::
````
::

The chart takes the same card, colors, and typeface as the other types wherever the spec sets none. Use the spec's own `config` to change them, since it wins over the chart's. A chart drawn from a spec takes only `title` from the props, and no notes: draw them with a `text` or `rule` layer in the spec.

### Copy

Hover a chart, or tab to it, for its Copy button in the top corner. It copies the chart as a PNG at twice its size, in the page's colors. The arrow beside it opens a menu that also copies the **Data** table: as a table, which Google Sheets, Excel, Notion, and Docs paste as cells, or as Markdown, a table that renders on GitHub. A chart with [notes](/charts/notes/) copies its data instead, since the PNG would leave the notes out. The button only shows once the script runs.

## Examples

### Reject a document before publishing

The plugin checks every chart while parsing and adds the problems to `meta.issues`. Throw on them to stop a broken document:

```ts
import { parseMarkdown } from "comark";
import charts from "comark-charts";

const { meta } = await parseMarkdown(markdown, { plugins: [charts()] });
if (meta.issues.length) throw new Error(meta.issues.join("\n"));
```

To check documents without drawing them, as comark-linter does, pass `charts({ draw: false })`.

### Fit the column

Every chart is laid out the same way, so two charts of one table look alike wherever they are:

- A chart keeps the size its text was set for instead of stretching to the column, so labels read the same in every chart.
- A narrower column, or a printed page, shrinks it to fit, as it does a screenshot.
- No row is ever dropped. A long sideways chart grows taller.

## Accessibility

Each chart's SVG is an image named by its `title`. Without one, the name says what it draws, such as "bar chart of ducks by team". Charts are static: they have no tooltips, and the **Data** table under the chart holds every number for a screen reader. A chart with marks zooms like a [screenshot](/annotate/components/screenshot/#accessibility).

The Copy button is named "Copy the chart as an image", or "Copy the chart's data" on a chart with notes, and the arrow beside it is "More ways to copy", a button that opens a `menu` of `menuitem`s. A status line beside them announces "Copied as image", "Copied as table", "Copied as Markdown", or "Couldn't copy here". The bar shows while the chart has focus, so a keyboard reaches it the way a pointer does.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab`, `Shift+Tab` | Moves to the Copy button and the arrow, and closes an open menu. |
| `Enter`, `Space` | On Copy or a menu item, copies. On the arrow, opens the menu. |
| `ArrowDown` | On the arrow, opens the menu. In the menu, moves to the next item. |
| `ArrowUp` | In the menu, moves to the previous item. |
| `Home`, `End` | In the menu, moves to the first or last item. |
| `Escape` | Closes the menu and returns to the arrow. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `type` | `bar` | `bar`, `stacked`, `line`, `area`, `scatter`, `dumbbell`, `waterfall`, `pie`, `gantt`, or `sankey`. |
| `x` | The first column | The column along the x axis. |
| `y` | Every column but `x` | The columns to draw, separated by commas. |
| `title` | — | The chart's caption, and its name for screen readers. |
| `labels` | Off | Prints the numbers on the chart: on each bar, beside each waterfall step, dumbbell row, and sankey node, and past each gantt bar. Takes no value. Lines, areas, scatter plots, and pies don't take it. |
| `horizontal` | Off, or on past 40 bars | Turns bars sideways. Takes no value. Only `bar` and `stacked` charts take it; dumbbells and gantts always run sideways. |

### Options

Options go under `charts` in `comarkUi()`, or to `charts()` when you use it alone.

| Option | Default | Description |
| --- | --- | --- |
| `draw` | `true` | `false` checks every chart without drawing it, as comark-linter does. |

### Issues

The plugin adds these problems to `meta.issues`. Each issue names its chart by its position in the document and says how to fix it:

```txt
`::chart` 2: row 3 has `41 kB` in `size`, which isn't a number. Write the number alone, such as `1200` or `1,200`, and put the unit in the header, such as `size (ms)`.
```

- Unknown props and types.
- Columns that `x` or `y` name but the table doesn't have.
- Cells that aren't numbers.
- Tables without rows, or with unnamed or repeated columns.
- An x value that appears twice.
- Content besides the table and its annotations.
- Data that doesn't fit the type, such as a line or an area of one row, a scatter without numbers on x, a dumbbell with one column, a pie or a waterfall with several, and a pie with a negative number or nothing but zeros.
- `labels` or `horizontal` with a value, or on a type that doesn't take it.
- A waterfall whose last row isn't its first plus every change.
- A chart that couldn't be drawn, which shows its table alone.
- A sankey without a column to flow from, one to flow to, and one of amounts, a flow of 0 or less or into its own node, a loop, and a node that sends out more than it takes in.
- A gantt without one start and one end column, a row missing its start or its end, a bar that ends before it starts, and two columns of names to color by.
- A Vega-Lite spec that isn't one JSON object, has `data`, reads a field that's neither a column nor made by a transform, or that Vega-Lite can't draw, and a spec chart with `type`, `x`, `y`, or an `::annotation`.

[Notes](/charts/notes/#issues) have checks of their own, on their page.

Rendering never throws. A chart with a problem draws what it can:

- A cell that isn't a number is left out.
- A type that doesn't fit draws bars.
- A waterfall whose end total doesn't add up still draws its last row as a total.
- `labels` or `horizontal` on a type that doesn't take it is ignored.
- A pie or a waterfall draws only its first column.
- A gantt row without a start or an end isn't drawn, and a gantt colors by its first column of names.
- A sankey leaves out a flow it can't draw, and a sankey with a loop shows its table.
- A Vega-Lite spec loses its links.
- A chart with nothing to draw shows its content as it is.

[comark-linter](/lint/) reports the same issues with their line numbers. Each one has its own rule in [Doctor](/doctor/).

### Renderers

Each renderer places the SVG the parse plugin drew:

| Renderer | Entry |
| --- | --- |
| `@comark/html` | `comark-charts/html`, which inlines the styles and the Copy button's script |
| `@comark/vue` | `comark-charts/vue` |
| `@comark/react` | `comark-charts/react` |
| `@comark/svelte` | `comark-charts/svelte` |

The Vue, React, and Svelte components add the styles and start the Copy button when they mount. When you render on a server, import `comark-charts/style.css` with your own styles so the page doesn't shift.

Marks come from comark-annotate, which renders only to HTML, so the other renderers draw the chart without them.

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

The package installs [Flint](https://github.com/microsoft/flint-chart) and [Vega](https://vega.github.io). Vue, React, and Svelte have renderers too, as [Renderers](#renderers) shows.

The comark-ui agent skill knows the table shape for each chart type and how to check the result. Agents install it with `vp dlx skills add onmax/comark-ui`. `vp` comes with [Vite+](https://viteplus.dev/guide/global-cli); without it, `pnpm dlx` takes the same arguments. Agents read charts without the skill: in the Markdown and in the page, each chart's data is a table.

## Theme

A chart is a card in the style of [shadcn/ui](https://ui.shadcn.com), so it switches with the page's dark mode. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

Charts read these [shared tokens](/guide/theming/), and their series read Nuxt UI's or shadcn/ui's chart colors:

| Token | Falls back to | Used for |
| --- | --- | --- |
| `--comark-foreground` | `--ui-text-highlighted`, `--foreground` | Values, the caption, the data table |
| `--comark-muted` | `--ui-text-muted`, `--muted-foreground` | Axis labels, the **Data** toggle, waterfall totals, the copy buttons' icons and the menu's hints |
| `--comark-border` | `--ui-border`, `--border` | The card, grid lines, the data table's rules, and the copy buttons' and the menu's outline |
| `--comark-background` | `--ui-bg`, `--background` | The card, the edges between slices and around points, the copy buttons, the menu, and a copied PNG's background |
| `--comark-accent` | `--ui-bg-elevated`, `--accent` | A hovered copy button or menu item, and the arrow while its menu is open |
| `--comark-ring` | `--ui-primary`, `--ring` | The focus ring on the **Data** toggle and the copy buttons |
| `--comark-radius` | twice `--ui-radius`, `--radius` | The card's, the copy buttons', and the menu's corners |
| `--comark-shadow` | A soft shadow, deeper in dark mode | The menu |
| `--comark-font` | `--font-sans` | All text |
| `--comark-chart-1` to `-6` | `--ui-chart-1` to `-6`, `--chart-1` to `-6` | Series, in column order |

Without either, series use six colors that read on light and dark pages: blue, orange, green, purple, rose, and yellow. A waterfall's increases and decreases are series 3 and 5.

### Variables

| Variable | Default | Used for |
| --- | --- | --- |
| `--cch-padding` | `1.5rem` | The space inside the card's sides. The **Data** footer runs to the card's edges, so it follows. |

Marks on a chart use comark-annotate's styles, and its [variables](/annotate/#variables) for their colors.

### Classes

A chart is a `figure.cch` with `data-type`, such as `data-type="bar"`, holding a `figcaption`, the SVG in `.cch-plot`, and the table in `details.cch-data` as its footer. A chart with marks adds `.cch-marked` to `.cch-plot`. `.cch-bar`, over the card's top corner, holds `.cch-status` and `.cch-copy`: the Copy button, `.cch-copy-main`, the arrow, `.cch-copy-more`, and the menu, `.cch-menu`, whose items are `button[data-chart-copy]`.

```css
:root {
  --comark-chart-1: oklch(0.65 0.2 250);
}

.cch {
  --cch-padding: 1rem;
}
```
