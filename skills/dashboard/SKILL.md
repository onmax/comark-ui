---
name: dashboard
description: Turns a dataset into an interactive dashboard page with tabs, filters, stats, charts, matrices and tables, from one report.json and a shared template. Use when the reader wants to explore data rather than decide from a write-up.
license: MIT
---

# Dashboard

A dashboard is one `report.json`: the data rows, the filters, and the blocks on each tab. This skill's template draws it as an _instrument_, the way an analytics tool looks: a top bar with the tabs, a strip of numbers that stays on every tab, flat sections of charts and tables, the rows behind the numbers at the bottom, and a filter sidebar on the right where every name keeps one color across the page. You decide **what to show**; the template owns **how it looks**. You write no HTML, CSS or page script.

Words are the scarcest thing on the page. A reader scans numbers, colors and bars; prose goes in `method`. The build rejects text past its limit.

When the reader has to choose between options or approve a plan, write a `report` instead: a page with the answer first. A dashboard is for data someone explores.

The block reference is [references/blocks.md](references/blocks.md); read it before step 4.

## Build it

The build checks `report.json`, writes one self-contained `report.html`, and screenshots every tab. Copy this skill's [scripts/](scripts/build.mjs) and [assets/](assets/app.js) folders next to the report, keeping them side by side, then:

```sh
mkdir -p tmp/dashboard && cd tmp/dashboard
echo '{ "private": true, "type": "module" }' > package.json
pnpm add --ignore-workspace comark-ui playwright
node ../../scripts/build.mjs ../../report.json ../../report.html --shots ../../shots
```

Without its own `package.json`, pnpm walks up to the repository's and can fail on its catalog. Vega and Vega-Lite come from comark-ui's install and are inlined into the page, so it opens from disk with no network but for its font. When Playwright has no browser downloaded, the build uses the newest Chromium in `~/.cache/ms-playwright`.

## Steps

1. **Questions.** From the request, write the 3 to 6 questions the reader wants answered. Each becomes a tab. Name each one's _shape_: change over time, share of a whole, ranking, two numbers per item, spread, two categories crossed, or a lookup of one item.
   Done when every question has a shape and none overlaps another.

2. **Profile.** Write a short script that prints, for each source file, its row count, every field with its type, range and share of nulls, and a few sample rows. Read the source's README for what each field means and how it was counted.
   Done when you can name the fields and the join keys each question needs, and the caveats the README states.

3. **Entities and filters.** Pick the one or two _entities_ the reader thinks in (customers, repositories, countries, types of work) and the period or mode they switch between. Each entity becomes a `list` filter: it gets a color that every block reuses, a row in the sidebar with its count, and a click target in every table and bar list. The period becomes a `tabs` filter. Give every dataset that should follow a filter that filter's column.
   Done when each entity and period is a filter and you know which datasets carry its column.

4. **Prep.** Write `prep.py` (or `prep.mjs`) next to the report. It reads the raw files and writes `report.json` with aggregated rows: one dataset per block shape, plus one dataset of evidence rows (the people, tickets or items behind the numbers). Every number on the page is computed here, so a rerun on new data rebuilds the report. Fold any long tail into one `Other` row.
   Done when the script runs from scratch and prints the headline numbers you'll quote.

5. **Blocks.** Put 4 to 6 numbers in `top` (a `stats` block) and the evidence rows in `bottom` (a `table` with `"style": "rows"`); both stay on every tab. On each tab, pick 2 to 6 blocks by the question's shape, using the table in [references/blocks.md](references/blocks.md), and mix them: a tab of only line charts reads as a chart dump, a tab with a table, a matrix and a bar list reads as an instrument. Open the first tab with a `facts` block: 2 or 3 numbers that answer the request, each with one sentence.
   Done when every block answers its tab's question and no two blocks show the same numbers.

6. **Words, last.** Write a short product-like `title` and a `subtitle` (the source and the date range), a `title` per block that names what is measured, and a `note` only where a block would mislead without it or says how to use it ("Click a row to filter"). Definitions, caveats and how you counted go in `method`.
   Done when no block has a sentence the numbers already show.

7. **Build and look.** Run the build and fix every error it prints; each one says how. Then open **every** screenshot, light and dark and phone, and check it like a reader: labels collide or are cut, a block is empty or flat, colors disagree between blocks, a tab without a table or matrix, a fact the blocks don't support. Change the blocks or the prep, not the template.
   Done when the build exits 0 and you have opened every screenshot of the last build.

8. **Hand back** the path to `report.html`, the screenshot folder, and three lines: what the report answers, the most surprising finding, and anything the data couldn't answer. The page is one file that opens from disk or any static host. When the reader wants to share it, publish it to [Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=skills): the link is private, a rebuild on new data becomes a new version at the same URL, and readers can comment on the numbers.

## When the blocks don't fit

Try another block, a different aggregation in the prep script, or two smaller blocks first. If the question still needs a chart the blocks can't draw, use one `vega` block with a Vega-Lite spec (see [references/blocks.md](references/blocks.md)). The build counts these, so keep them rare and say why in your hand-back.
