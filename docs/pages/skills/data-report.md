---
title: Data report
description: A dataset turned into an analytics page, with headline figures, findings, and a section of charts per question.
icon: chart-column
keywords: analytics, dashboard, data, export, metrics, KPI, heatmap, chart, report, BI
tagline: Your agent profiles the data, computes every number in one script, and builds a page of charts with a top bar and a sidebar, in light and dark.
---

::skill{name="data-report"}
::

## What it does

The skill turns an export, a database, logs, or eval results into one page with a fixed shape:

- the **headline figures** in one strip
- **what stands out**, three to five findings, each linking to the chart that shows it
- **one section per question**, each with the chart that answers it: bars, stacked bars, lines, heatmaps, log scales, and money as `$22.2k`
- **how the numbers were made**, folded at the end

Every number comes from one script the agent keeps, so the next run starts from the script rather than from the page.

The skill's `build.mjs` wraps the report in a page: a top bar with a link per section, a sidebar with the outline and where the data comes from, and a light and dark toggle. The result is one HTML file that opens from disk or deploys as a static page.

## When to use it

Ask with the data at hand, such as "Build a report of this support export" or "Make a dashboard of these eval runs." To be sure, say "Use the data-report skill."

Choose by what you have:

- Data to explore and summarize: this skill.
- Options to compare, or a plan to approve: [Report](/skills/report).

## It's working if

- The strip at the top answers how much in four to seven figures.
- Each finding's number appears in a chart of the section it links to.
- Every chart has a title with its measure, a description that says what to see, and a unit when its numbers have one.
- A category keeps its color on every chart.
- The page ends with what a row is, what was left out, and the script that made the numbers.

## The chart gallery

The skill's `references/charts.md` maps each question shape to its chart, in the house style the reports follow. The same build script renders it, so it doubles as a gallery of every chart type in light and dark.
