---
name: data-report
description: Turns a dataset into an analytics report page, with headline figures, what stands out, one section of charts per question, and a sidebar, built as one HTML file. Use when someone has data, such as an export, a database, logs, or eval results, and wants a dashboard, analytics, or a report of it.
license: MIT
---

# Data report

A reader opens a data report to learn how much, where, when, and who, and to check any number they doubt. So the page has a fixed shape: the headline figures in one strip, what stands out, one section per question with its charts, and how the numbers were made. Every number comes from one script you keep, never from your head.

For a page someone decides from, such as options or a plan, use `report`. This skill starts from raw data.

## 1. Profile the data

Load the data in a script, in whatever reads it and is installed: Python (its standard library is enough), pandas or DuckDB, SQL, or Node. Print the row count, each column's type, the date range, the distinct values of each category with their counts, and the empty cells per column.

Done when you can say in one line what one row is, such as "one customer message", one line per source when there are several, and you've listed the **dimensions** (categories, dates, people) and the **measures** (counts, durations, costs, scores).

## 2. Write the questions

Write four to seven questions a reader of this data would ask, in the order they'd ask them. Each names one measure and one or two dimensions: "Which customers ask the most, and about what?" Each becomes a `##` section.

Done when every question names its measure and its dimensions, and none needs a number the data doesn't hold.

## 3. Compute every number in one script

Write `analyze.py` (or `.ts`, or `.sql`) that reads the raw data and prints each chart's table as Markdown, the headline figures as the `::stats` table, and each finding's number. Keep at most seven series per chart, and seven bars when the x column holds names; add the rest up as `other`. A time axis keeps every period. Sort by value unless the order means something, such as time or steps.

Done when the script runs from a clean start and prints every table and number the page will use. Rerun it after any change to the data or the questions, and paste its output rather than retyping it.

## 4. Pick each section's chart

Read [references/charts.md](references/charts.md) for which chart answers which question shape, and its house style, the rules every chart on the page follows. [references/blocks.md](references/blocks.md) has the syntax of every block the page uses. Give each question one chart. Add a plain Markdown table after it only for numbers a reader looks up, at most five columns.

Done when every question has its chart and each chart follows every house-style rule: a `title` with the measure, a `description` with what to see, a `unit` when the numbers have one, and at most eight series.

## 5. Write the page

Follow [references/example.md](references/example.md), a finished report, in this order:

1. **Frontmatter**: `title`, `description` (what the data covers, in one line), then fields about the data, such as `source`, `period`, `rows`, and `updated`, each source's span on its own when they differ. How the numbers were made goes in the Method section, not here. The sidebar lists every field besides the title and description under "About the data".
2. **Headline strip**: `::stats{tiles}` with four to seven figures, a name and a value each.
3. **What stands out**: three to five numbered findings. Each puts its number in bold and links to the section whose chart shows it.
4. **One `##` section per question**, opening with one sentence on what to look at when the chart's description doesn't say it, then its chart.
5. **Method**: a `::details` that says what a row is, what was left out, how each measure was computed, and the name of the script.

Done when every number in a finding appears in a chart or table of the section it links to.

## 6. Build and check it

Copy this skill's [scripts/build.mjs](scripts/build.mjs) beside `report.md`. From that directory, build the page in a folder of its own:

```sh
mkdir -p tmp/report && cd tmp/report
echo '{ "private": true, "type": "module" }' > package.json
pnpm add --ignore-workspace comark @comark/html comark-ui playwright
pnpm exec playwright install chromium
node ../../build.mjs ../../report.md report.html --shots shots
```

Without its own `package.json`, pnpm walks up to the repository's and can fail on its catalog. If the build says `description` or `unit` isn't a prop of `::chart`, that comark-ui is older than this skill: install `comark-ui@latest`. The script refuses a report with issues and prints each one with its fix. It writes `report.html`: a top bar with a link per section, the report, and a sidebar with the page's outline and the data's fields, in light and dark with a toggle. `--shots` saves the page in both themes, in slices about two screens tall, with the Data folds closed.

Read every slice. Each chart must say what its description says, with no label on another, no empty chart, and the same category in the same color on every chart.

Done when the build exits 0 and every slice in both themes passes that read.

## 7. Hand it over

`report.html` is one file with its styles, charts, and script inside, so it opens from disk, attaches to a message, or deploys as a static page. To share a link, publish it to a host such as [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=skills) as HTML. A host that renders the Markdown itself draws the charts only if its comark-ui has the props the report uses.

Hand over the HTML, the Markdown, and `analyze.py`, so the next run starts from the script rather than from the page.
