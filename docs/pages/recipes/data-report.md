---
title: A data report
description: Headline figures, findings, and a section of charts per question, from one export, in one Markdown file.
keywords: analytics, dashboard, report, KPI, metrics, heatmap, data, BI
tagline: Turn a dataset into a page a reader decides from, with the figures first, then what stands out, then a chart per question.
install: pnpm add comark @comark/html comark-ui
---

::example{label="Data report"}
````md
::stats{tiles}
| Figure | Value |
| --- | --- |
| Questions | 418 |
| Threads | 297 |
| Customers | 8 |
| Answerable today | 78% |
| With action drafts | 87% |
| Median first reply | 1.3 h |
| With a screenshot | 37% |
::

## What stands out

1. **78% of questions** can be answered today from the thread, the docs and code, and product data. Action drafts lift that to 87%. See [Sources](#sources).
2. **Data missing** is the largest type, 103 questions (25%). See [Question types](#question-types).
3. **Contoso** asks 93 questions, and 9 of them need someone from the team. See [Customers](#customers).

## Sources

Each step adds one source an answer can draw on, from what the thread already holds to what only the team knows. What stays below 100% at the last step needs a person.

::chart{type="line" unit="%" title="Share of questions answerable, adding one source at a time" description="All questions, and the two customers who ask the most."}
| step | all | Contoso | Northwind |
| --- | --: | --: | --: |
| thread only | 20 | 20 | 16 |
| + docs and code | 55 | 49 | 55 |
| + product data | 78 | 78 | 76 |
| + action draft | 87 | 90 | 87 |
::

## Customers

::chart{type="stacked" horizontal title="Questions per customer, by the last source a reply needs" description="The first three steps are answerable today; team only needs a person."}
| customer | thread only | docs and code | product data | action draft | team only |
| --- | --: | --: | --: | --: | --: |
| Contoso | 19 | 27 | 27 | 11 | 9 |
| Northwind | 12 | 30 | 16 | 8 | 10 |
| Tailspin | 15 | 17 | 10 | 1 | 9 |
| Fabrikam | 8 | 16 | 13 | 4 | 7 |
| Wingtip | 10 | 15 | 9 | 1 | 8 |
| Litware | 8 | 15 | 5 | 6 | 3 |
| Adventure Works | 7 | 13 | 9 | 3 | 5 |
| Proseware | 4 | 13 | 7 | 4 | 4 |
::

::chart{type="heatmap" title="Questions per customer and type" description="Darker cells hold more questions."}
| customer | Data missing | How it works | Forecast | Purchasing | Bug | Alerts |
| --- | --: | --: | --: | --: | --: | --: |
| Contoso | 20 | 20 | 18 | 13 | 10 | 7 |
| Northwind | 20 | 19 | 8 | 10 | 8 | 1 |
| Tailspin | 11 | 10 | 9 | 7 | 4 | 3 |
| Fabrikam | 13 | 10 | 7 | 8 | 4 | 3 |
| Wingtip | 10 | 13 | 5 | 4 | 1 | 3 |
| Litware | 10 | 6 | 1 | 3 | 6 | 8 |
| Adventure Works | 10 | 4 | 4 | 5 | 4 | 5 |
| Proseware | 9 | 6 | 5 | 3 | 3 | 4 |
::

## Question types

::chart{horizontal title="Questions per type" description="Sorted by volume."}
| type | questions |
| --- | --: |
| Data missing | 103 |
| How it works | 88 |
| Forecast | 57 |
| Purchasing | 53 |
| Bug | 40 |
| Alerts | 34 |
| Feature request | 27 |
| Setup | 16 |
::

::chart{type="heatmap" better="higher" unit="%" title="Share answerable today, per type" description="Setup, feature requests, and bugs need the team most often."}
| type | answerable today |
| --- | --: |
| Data missing | 80 |
| How it works | 86 |
| Forecast | 77 |
| Purchasing | 75 |
| Bug | 65 |
| Alerts | 88 |
| Feature request | 63 |
| Setup | 62 |
::

## Over time

::chart{type="stacked" title="Questions per month, by type" description="The four largest types, and the rest together."}
| month | Data missing | How it works | Forecast | Purchasing | other |
| --- | --: | --: | --: | --: | --: |
| 2026-05 | 9 | 13 | 4 | 6 | 11 |
| 2026-06 | 20 | 13 | 6 | 6 | 13 |
| 2026-07 | 17 | 6 | 11 | 10 | 13 |
| 2026-08 | 19 | 15 | 17 | 10 | 29 |
| 2026-09 | 18 | 15 | 7 | 9 | 25 |
| 2026-10 | 18 | 20 | 10 | 10 | 18 |
::

::chart{type="line" log unit="h" title="Time to first reply" description="Median and 90th percentile per month, on a log scale."}
| month | median | p90 |
| --- | --: | --: |
| 2026-05 | 2.04 | 15.7 |
| 2026-06 | 1.23 | 8.8 |
| 2026-07 | 1.04 | 6.0 |
| 2026-08 | 1.33 | 8.4 |
| 2026-09 | 1.01 | 4.8 |
| 2026-10 | 1.02 | 3.1 |
::

## Team

::chart{type="heatmap" title="Replies per person and type" description="Ana answers most of every type."}
| person | Data missing | How it works | Forecast | Purchasing | Bug | Alerts |
| --- | --: | --: | --: | --: | --: | --: |
| Ana | 52 | 42 | 25 | 26 | 24 | 17 |
| Ben | 26 | 19 | 13 | 15 | 9 | 10 |
| Chen | 16 | 20 | 12 | 9 | 4 | 6 |
| Dara | 9 | 7 | 7 | 3 | 3 | 1 |
::

| Person | Replies | Median first reply |
| --- | --: | --: |
| Ana | 215 | 1.4 h |
| Ben | 101 | 1.1 h |
| Chen | 71 | 1.1 h |
| Dara | 31 | 1.2 h |

## Method

::details{summary="How the numbers were computed"}
The export holds one row per customer message. A question is a message that asks for something; thanks and scheduling are left out. Each question was classified by its type and by the last source a sendable reply needed, in the order the line chart adds them. First reply is the time from the customer's first message to the team's first reply, in calendar hours. Every number on this page comes from one script over the export, `analyze.py`, and nothing was typed by hand.
::
````
::

## The order

A reader opens a data report to learn how much, where, when, and who, so the page keeps one shape:

1. `::stats{tiles}` holds the headline figures in one strip, a name and a value each.
2. **What stands out** lists three to five findings, each with its number in bold and a link to the section whose chart shows it.
3. Each `##` section answers one question with one chart: [bars](/charts#type) for how many, stacked bars for how a total splits, a [heatmap](/charts#heatmap) for two groupings crossed or for scores, a line for a trend, and money with [`unit="$"`](/charts#unit).
4. A `::details` at the end says how every number was computed.

Every chart has a `title` with what it measures and a `description` with what to see. The charts span the column, so a page of them reads like a dashboard.

## Build it with an agent

The [data-report skill](/skills/data-report) has an agent profile the data, compute every number in one script, and write this page. Its `build.mjs` wraps the page in one HTML file with a top bar, a sidebar with the outline and where the data comes from, and a light and dark toggle.

## Check it

Run [comark-linter](/lint) on the file, then open the rendered page and read every chart: each must say what its description says, with no label over another.
