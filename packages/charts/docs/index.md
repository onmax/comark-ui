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

- The source is a plain Markdown table, not a chart spec.
- The table stays under the chart, folded into **Data**, so text tools keep the numbers.
- Vega draws every chart while parsing, so the browser never loads it.
- A Copy button copies the chart as a PNG, and its menu copies the data as a table for a spreadsheet or as Markdown.
- [Notes](/charts/notes/) mark a row or a value, or draw a line across the chart at a target.
- Ten types cover bars, lines, pies, [gantt charts](#gantt-charts), and [sankeys](#sankey). A [Vega-Lite spec](#vega-lite) draws anything else in the same card, colors, and type.
- Without the plugin, the table still renders as a table.

## Usage

Put one table between `::chart` and `::`, with a header row, then one row per bar, point, or step. The first column is x. Every other column is a series of numbers, named by its header. Rows draw in table order.

```md
::chart{type="line" x="month" y="coffee cups, commits" title="Coffee cups and commits"}
| month | coffee cups | commits |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
::
```

Cells hold plain numbers, with commas between thousands if you like, such as `1,200`. Put units in the header or title, such as `size (kB)`.

x values like `2026`, `2026-04`, `2026-04-15`, or an ISO date and time sit on a time axis, and numbers on a number axis. Bars, steps, and dumbbells instead give each value its own row.

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
| `gantt` | Steps or tasks over time, such as a build, a deploy, or a plan. | One row per bar: its name, its start, and its end, as numbers or dates. See [Gantt charts](#gantt-charts). |
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

In a waterfall, the first row is the start total and the last row the end total. The rows between are changes, green up and red down. The plugin reports an end total that isn't the start plus every change.

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

Use the `y` prop to pick the columns to draw, separated by commas. It defaults to every column but `x`. Two or more series get a legend over the plot, as do a pie's slices and a gantt's groups.

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

Upright bars wrap a long name onto up to three lines, and cut it short past that. A chart of more than 40 bars runs sideways without `horizontal`. Dumbbells and gantts always run sideways, so the plugin reports `horizontal` on them.

### Labels

Use the `labels` prop to print the numbers on the chart. Write it alone, with no value. Without it, the value axis and the **Data** table carry the numbers.

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

Where the numbers print depends on the type:

- **Bars and stacked bars** write each value in white inside its bar or segment, and drop the value axis. A value that doesn't fit goes just past the bar's end, but in a stack only the outermost part can do that. Other values that don't fit, or would cover another bar's, appear only in the **Data** table.
- **Waterfalls** print each step's change and each total's value beside it, when the numbers fit their steps.
- **Dumbbells** print each row's least and most values beside its outer dots, when the plot has room.
- **Gantts** print how long each bar lasts past its end.
- **Sankeys** print each node's amount under its name.

A `bar` worth zero draws as a thin, faded stroke in its series' color at the base, so a grouped chart keeps a lane for it.

> [!NOTE]
> Lines, areas, scatter plots, and pies have nothing to print on, so the plugin reports `labels` on them.

### Gantt charts

Use `type="gantt"` with a table of three columns: the bar's name, its start, and its end. Start and end hold numbers or dates. Each row is one bar, top to bottom in table order.

```md
::chart{type="gantt" title="A Friday deploy, minutes after 16:55"}
| step | start | end |
| --- | --: | --: |
| tests | 0 | 6 |
| build | 6 | 11 |
| deploy | 11 | 13 |
::
```

When the table has other numbers too, such as a duration, name the start and end columns with `y="start, end"`.

A column of names, such as a phase, an owner, or a run, gives each name its own color and a legend. A task can then repeat across groups, like one step in two runs. To mark one, name its group in the [note](/charts/notes/#series)'s `series`.

> [!NOTE]
> A column of numbers reads as times, so write numbered groups as names, like `shard 1`.

A row that ends where it starts is a milestone, drawn as a diamond. With `labels`, every other bar prints how long it lasts past its end. That's the difference for numbers, or a span in the table's unit for dates, such as `3y`, `2mo`, `7d`, or `1.5h`. A gantt has no value axis, so it takes no target line.

Dates take the same forms as x values. A time without a zone is UTC, and so is the axis, so the chart reads the same anywhere.

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

Use `type="sankey"` with a table of three columns: where each flow comes from, where it goes, and how much. Each name is a node, and each row a flow between two nodes. Nodes stack top to bottom in the order the rows first name them, and nodes that only take flows in sit in the last column.

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

A flow comes from the first column unless `x` names another, and goes to the next column of names. Its amount is the column of numbers unless `y` names one. A flow into a node that ends there takes that node's color, and any other flow its source's.

> [!NOTE]
> A sankey runs one way, so the plugin reports a flow back into a node it came from, and the chart shows its table. Split such a node in two, such as `pond (spring)` and `pond (summer)`.

The plugin also reports a flow of 0 or less, a flow from a node into itself, two rows with the same pair of nodes, and a middle node that sends out more than it takes in. A sankey has no value axis, so it takes no target line. A [note](/charts/notes/) marks a node by its name in `at`.

### Notes

Put an `::annotation` after the table to mark a row or a value with a hand-drawn mark and a note, or draw a target across the plot. [Notes](/charts/notes/) lists their props.

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

For a chart the types don't cover, such as a box plot, a heatmap, or error bands, put a [Vega-Lite](https://vega.github.io/vega-lite/) spec in a `vega-lite` block after the table. The table stays on the page as the data. Each row becomes one data point, with a field per column named by its header. Cells that read as numbers become numbers, empty ones null, and the rest stay text.

Leave `data` out of the spec, and name the columns in its `encoding`. The spec can't load files or URLs.

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

The chart gets the other types' card, colors, and typeface wherever the spec sets none, and the spec's own `config` wins over them. A spec chart takes only `title` from the props, and no notes. Draw notes with a `text` or `rule` layer in the spec.

### Copy

Hover or tab to a chart for the Copy button in its top corner. It copies a PNG at twice the chart's size, in the page's colors. Its arrow opens a menu that copies the **Data** table, as a table that Google Sheets, Excel, Notion, and Docs paste as cells, or as Markdown that renders on GitHub. A chart with [notes](/charts/notes/) copies its data, since the PNG would leave the notes out. The button needs the script.

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

Two charts of one table look alike anywhere:

- A chart keeps the size its text was set for instead of stretching to the column, so labels read the same in every chart.
- A narrower column or a printed page shrinks it to fit, like a screenshot.
- No row is ever dropped. A long sideways chart grows taller.

## Accessibility

Each chart's SVG is an image named by its `title`, or else by what it draws, such as "bar chart of ducks by team". Charts have no tooltips. The **Data** table under the chart holds every number for a screen reader. A chart with marks zooms like a [screenshot](/annotate/components/screenshot/#accessibility).

The Copy button is named "Copy the chart as an image", or "Copy the chart's data" on a chart with notes. The arrow beside it is "More ways to copy", a button that opens a `menu` of `menuitem`s. A status line beside them announces "Copied as image", "Copied as table", "Copied as Markdown", or "Couldn't copy here". The bar shows while the chart has focus, so a keyboard reaches it too.

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
| `labels` | Off | Prints the numbers on the chart, as [Labels](#labels) shows. Takes no value. Lines, areas, scatter plots, and pies don't take it. |
| `horizontal` | Off, or on past 40 bars | Turns bars sideways. Takes no value. Only `bar` and `stacked` charts take it. Dumbbells and gantts always run sideways. |

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

[Notes](/charts/notes/#issues) have their own checks.

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

The package installs [Flint](https://github.com/microsoft/flint-chart) and [Vega](https://vega.github.io). [Renderers](#renderers) lists the Vue, React, and Svelte entries.

The comark-ui agent skill knows the table shape for each chart type and how to check the result. Install it with `vp dlx skills add onmax/comark-ui`. `vp` comes with [Vite+](https://viteplus.dev/guide/global-cli), and without it `pnpm dlx` takes the same arguments. Agents read charts without it too, since the data is a table.

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

A chart is a `figure.cch` with `data-type`, such as `data-type="bar"`, holding a `figcaption`, the SVG in `.cch-plot`, and the table in `details.cch-data` as its footer. A chart with marks adds `.cch-marked` to `.cch-plot`. `.cch-bar`, over the card's top corner, holds `.cch-status` and `.cch-copy`. `.cch-copy` holds the Copy button `.cch-copy-main`, the arrow `.cch-copy-more`, and the menu `.cch-menu`, whose items are `button[data-chart-copy]`.

```css
:root {
  --comark-chart-1: oklch(0.65 0.2 250);
}

.cch {
  --cch-padding: 1rem;
}
```
