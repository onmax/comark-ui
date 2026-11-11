---
title: Chart gallery
description: Which chart answers which question, in the house style
source: Made-up numbers, one table per chart
---

Every chart is a Markdown table inside `::chart`: the first column is x, every other column is a series, and the table stays under the chart in a **Data** fold. Each section below is one question shape, its chart, and the rules that keep it readable.

## House style

These hold for every chart on the page:

- `title` says what is measured, per what, and in what unit when there's no `unit`: "Questions per customer", "Time to first reply (h)".
- `description` says what to see, in one sentence: "Northwind asks twice as many as anyone."
- `unit` goes on every chart whose numbers have one: `$` prints before the number, `%`, `h`, and `ms` after. Numbers from a thousand up print short, as `$22.2k`.
- One measure per chart. Two measures, such as questions and reply time, are two charts.
- At most eight series. Past that, keep the seven largest and add the rest up as `other`.
- Rows sorted by value, largest first, unless their order means something: time, steps, or a funnel.
- A category keeps its column position in every chart, so it keeps its color across the page. Series take their colors by column: blue, tan, teal, violet, rose, amber, then six more. Put a series that means trouble, such as failures, fifth, so it draws in rose.
- Bars and heatmaps print their numbers, and stacked bars print each stack's total past its end and each part inside it where it fits. Leave that on; `labels=false` is for charts so dense the numbers collide.

## How many, per name

Bars, sideways when the names are long or there are more than about six. Sort them.

::chart{horizontal title="Questions per type" description="Data questions are a quarter of the total."}
| type | questions |
| --- | --: |
| Data missing | 88 |
| How it works | 63 |
| Forecast | 44 |
| Purchasing | 37 |
| Bug | 37 |
| Alerts | 30 |
::

## How each total splits

Stacked bars, the parts in a fixed order, from the one the reader cares about first.

::chart{type="stacked" horizontal title="Questions per customer, by the last source a reply needs" description="Northwind needs the team for one question in five."}
| customer | thread only | docs and code | product data | team only |
| --- | --: | --: | --: | --: |
| Northwind | 13 | 26 | 24 | 17 |
| Contoso | 19 | 18 | 16 | 11 |
| Fabrikam | 15 | 9 | 10 | 8 |
| Tailspin | 11 | 15 | 11 | 1 |
::

## Two groupings crossed

A heatmap, rows and columns in the order the reader scans them. It reads best up to about 12 columns.

::chart{type="heatmap" title="Questions per customer and type" description="Northwind's data questions are the largest cell."}
| customer | Data missing | How it works | Forecast | Bug |
| --- | --: | --: | --: | --: |
| Northwind | 21 | 9 | 10 | 16 |
| Contoso | 15 | 17 | 7 | 7 |
| Fabrikam | 11 | 7 | 4 | 2 |
| Tailspin | 7 | 11 | 3 | 5 |
::

## Scores or pass rates

A heatmap with `better`, so red and green say good and bad without a legend. `better="lower"` for error rates and costs.

::chart{type="heatmap" better="higher" title="Judge score per section, out of 10" description="Every agent struggles with validation."}
| agent | Score | Features | Data | Auth | Validation | Security |
| --- | --: | --: | --: | --: | --: | --: |
| Fable 5.2 high | 8.6 | 10 | 10 | 10 | 6.2 | 4.3 |
| Opus 5.5 high | 8.5 | 10 | 9 | 9.6 | 4.6 | 5 |
| GPT-6.1 Sol xhigh | 7.9 | 9.1 | 8.3 | 10 | 1.5 | 6.4 |
| GPT-6 Luna low | 4 | 1.9 | 7.6 | 6.7 | 0 | 2.1 |
::

## A trend over time

A line, x as dates such as `2026-05` or `2026-05-04`. Two to eight lines are named at their ends; past that, split the chart.

::chart{type="line" unit="h" log title="Time to first reply" description="The median halved since May; the slowest tenth still waits half a day."}
| month | median | p90 |
| --- | --: | --: |
| 2026-05 | 2.79 | 11.5 |
| 2026-06 | 2.37 | 7.5 |
| 2026-07 | 0.97 | 2.9 |
| 2026-08 | 1.46 | 6.7 |
| 2026-09 | 1.41 | 4.1 |
| 2026-10 | 0.72 | 3.8 |
::

## Volume over time, by part

Stacked bars per month or week. Use bars rather than an area when there are fewer than about 20 periods.

::chart{type="stacked" title="Questions per month, by type" description="August doubled May, mostly in data questions."}
| month | Data missing | How it works | other |
| --- | --: | --: | --: |
| 2026-05 | 7 | 2 | 12 |
| 2026-06 | 10 | 10 | 17 |
| 2026-07 | 14 | 10 | 30 |
| 2026-08 | 21 | 13 | 42 |
::

## One measure against another

A scatter for points, or a line over numbers when each series is one thing at several settings, such as a model at each effort. Costs and token counts that run from cents to thousands go on `log`.

::chart{type="line" log="x" unit="pts" title="Score against cost per task ($)" description="Each line is one model from low to max effort."}
| cost per task | Luna | Opus | Fable |
| --: | --: | --: | --: |
| 0.005 | 10 | | |
| 0.05 | 19 | | |
| 0.2 | 28 | | |
| 1 | | 35 | |
| 2 | | 48 | 55 |
| 10 | | 59 | 62 |
| 20 | | | 65 |
::

## Before and after

Grouped bars for one to three metrics, a dumbbell past that.

::chart{type="dumbbell" unit="ms" title="Page load before and after the cache" description="Every page got faster; search the most."}
| page | before | after |
| --- | --: | --: |
| home | 820 | 540 |
| search | 1450 | 610 |
| checkout | 980 | 720 |
| account | 640 | 510 |
::

## How spread out, per name

A dumbbell from the median to the slowest tenth, as two columns. It reads both the typical case and the tail, which an average hides.

::chart{type="dumbbell" unit="h" labels title="Time to merge, median to the slowest tenth" description="Fixes merge within hours; a tenth of features wait a day."}
| kind | median | p90 |
| --- | --: | --: |
| feature | 1.6 | 22 |
| fix | 0.6 | 4.3 |
| docs | 0.6 | 2.8 |
::

## Money across groups

Grouped bars with `unit="$"`. Keep the scale linear even when the largest bar flattens the rest, since bars on a log scale don't compare by length; say the gap in the description instead.

::chart{unit="$" title="Cost of a full benchmark run" description="High effort costs eight times low on the largest model."}
| model | low | medium | high |
| --- | --: | --: | --: |
| small | 9 | 40 | 63 |
| medium | 980 | 2,000 | 4,800 |
| large | 2,900 | 11,700 | 22,200 |
::

## How changes add up

A waterfall: the start total, each change, then the end total, which must be the start plus every change.

::chart{type="waterfall" title="Open tickets this quarter" description="More tickets closed than opened, so the queue fell to 73."}
| step | tickets |
| --- | --: |
| July | 140 |
| opened | 310 |
| closed | -365 |
| merged | -12 |
| October | 73 |
::

## Shares of one whole

A pie only for five or fewer slices that add up to a whole. Otherwise use sideways bars.

::chart{type="pie" title="Replies per person (%)" description="Ana writes almost half."}
| person | share |
| --- | --: |
| Ana | 46 |
| Ben | 25 |
| Chen | 21 |
| Dara | 8 |
::
