---
title: Dashboard
description: An interactive page for exploring data, with tabs, a filter sidebar, stats, charts, matrices and tables, from one report.json.
icon: layout-dashboard
keywords: dashboard, analytics, data, report.json, filters, charts, tables, heatmap, vega-lite
tagline: Your agent turns a dataset into a dashboard you click through, filter and share, drawn by one template so it never looks generated.
---

::skill{name="dashboard"}
::

[Open the example](https://drop.vitehub.dev/d/qmjw7dwepwfa/who-builds-nuxt-dashboard): an agent built it with this skill from the public [Nuxters](https://github.com/nuxt/nuxters) data, in one run.

## What it does

The agent writes `report.json`: the data rows, the filters, and the blocks on each tab. A shared template draws it, so the agent writes no HTML, CSS or page script. Every dashboard gets the same parts:

- a **top bar** with the tabs and a light and dark theme
- a **strip of numbers** that stays on every tab, and the **rows behind them** at the bottom
- **flat sections** of charts, segmented bar lists, heatmap matrices and tables, two to a row
- a **filter sidebar** with search, the period, and one list per entity, where every name keeps one color across the page and a click filters every block

The build rejects text past its limits and names the fix, so the page stays numbers first. It then screenshots every tab in light and dark and on a phone, and the agent reads each one before it hands the page back.

The result is one HTML file. It opens from disk or any static host, and you can publish it to [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=skills) to share it privately, with a new version on each rebuild and comments on the numbers.

## When to use it

Ask with the data in hand, such as "Build a dashboard of who contributes to our repos" or "Make this CSV explorable by country and month." To be sure, say "Use the dashboard skill."

- You explore data and filter it yourself: this skill.
- You choose between options or approve a plan: [Report](/skills/report).
- Findings about something that already exists: [Review document](/skills/review-document).

## What your agent needs

Node, a browser for the screenshots, and a folder with `comark-ui` and `playwright` installed. The page inlines Vega and Vega-Lite from comark-ui's install, so it needs no network once built but for its font.

## It's working if

- The first tab opens with two or three numbers that answer what you asked, each with one sentence.
- Every tab mixes block types: a table, a matrix or a bar list next to its charts.
- A name has the same color in the sidebar, the tables and the charts, and clicking it filters the page.
- Definitions and caveats sit on the Method tab, not under every chart.
- The agent hands back the screenshots it read and what the data couldn't answer.
