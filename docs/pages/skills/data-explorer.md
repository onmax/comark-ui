---
title: Data explorer
description: Your agent explores a dataset and turns what it finds into an interactive page of findings, graphs, matrices and tables, from one report.json.
icon: layout-dashboard
keywords: data, data science, dashboard, analytics, report.json, filters, charts, tables, heatmap, vega-lite
tagline: "Hand your agent a dataset and get back what's in it: the findings, and the graphs and tables behind them, on a page you click through, filter and share."
---

::skill{name="data-explorer"}
::

[Open the example](https://drop.vitehub.dev/d/qmjw7dwepwfa/who-builds-nuxt-dashboard): an agent built it with this skill from the public [Nuxters](https://github.com/nuxt/nuxters) data, in one run.

## What it does

The agent starts from the data, not the page. It writes down the questions you want answered, profiles every field, and computes every number in a prep script, so a rerun on new data rebuilds the page. Then it writes `report.json`: the data rows, the filters, and the blocks on each tab. A shared template draws it, so the agent writes no HTML, CSS or page script. Every page gets the same parts:

- a **top bar** with the tabs and a light and dark theme
- a **strip of numbers** that stays on every tab, and the **rows behind them** at the bottom
- **flat sections** of charts, segmented bar lists, heatmap matrices and tables, two to a row
- a **filter sidebar** with search, the period, and one list per entity, where every name keeps one color across the page and a click filters every block

The build rejects text past its limits and names the fix, so the page stays numbers first. It then screenshots every tab in light, in dark, and on a phone, and the agent reads each one before it hands the page back.

The result is one HTML file that opens from disk or any static host.

## When to use it

Ask with the data in hand, such as "What does this export say about who contributes to our repos?" or "Make this CSV explorable by country and month." To be sure, say "Use the data-explorer skill."

- You explore data and filter it yourself: this skill.
- You choose between options or approve a plan: [Report](/skills/report).
- Findings about something that already exists: [Review document](/skills/review-document).

## What your agent needs

Node with `playwright` installed, for the build that checks the page against its limits and screenshots it. With `vega` and `vega-lite` installed too, the page carries Vega and opens offline; without them it loads Vega from jsDelivr. Without Node, as in a chat app, the agent fills the skill's page template itself and checks the limits by hand.

## It's working if

- The first tab opens with two or three numbers that answer what you asked, each with one sentence.
- Every tab mixes block types: a table, a matrix or a bar list next to its charts.
- A name has the same color in the sidebar, the tables and the charts, and clicking it filters the page.
- Definitions and caveats sit on the Method tab, not under every chart.
- The agent hands back the screenshots it read and what the data couldn't answer.
