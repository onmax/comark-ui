---
name: report
description: Writes research, a ranked shortlist, a comparison, or a plan as one Markdown page someone decides from, with the answer and decisions first, the numbers in charts, and the detail folded. Use when the reader has to choose between options or approve a plan.
license: MIT
---

# Report

The reader scans a report before reading it. They want the answer, the decisions they have to make, and the numbers behind both, and they check the rest only when they doubt something. So the page has a fixed shape: the answer on top, one picture per section, short table cells, and detail folded underneath.

For findings about something that already exists, such as a code review or an audit, use `review-document`. For how something works, use `visual-explanation`. This skill shapes a report you already have the material for; gathering the material is the research itself.

## 1. Write the answer and the decisions

Write the answer in two sentences: what you recommend and the main reason. For a plan, that's the first step and the goal it serves. Under it, write each decision the reader has to make as a question they can answer yes or no. Up to three go in the callout as a numbered list. Past three, ask one question ("Take my recommendation on all seven?") and give the decisions their own table right after the answer.

Done when someone who reads only the answer and the callout knows what you recommend and what they have to decide.

## 2. Give every fact one home

List what the report holds: the items, their numbers, any order, the blockers, the findings, what you left out, how you checked. Give each one exactly one section. When the items have both a rank and an order to do them in, keep the order the reader acts on and put the rank's inputs, if it has any, in the picture. Another section refers to a fact by its name or number ("change 3", "D2") and leaves its value where it lives. Reuse the source's numbering; when you have to add IDs, give each kind a prefix no other kind starts with. A chart's table is already under it in a Data fold, so it gets no second copy.

Done when no value, list, or order is written out in two sections.

## 3. Pick one picture per section

A section opens with one sentence that says what to look at, then its picture. A second picture fits only when it answers the question the first one raises, such as the table of steps under the flowchart of their order. Numbers live in charts and table columns, and a sentence names only the number that matters.

| The section answers | Picture |
| --- | --- |
| Which items are worth it, by two scores and a size | Bubble chart: `::chart` with a `vega-lite` spec |
| How big each item is, or what each blocker would unlock | `::chart{type="bar" horizontal labels}` |
| How each item's size splits into parts | `::chart{type="stacked" horizontal}` |
| In what order, and what has to land first | `mermaid` flowchart, blockers as `{{hexagons}}` |
| How a mechanism moves between states | `mermaid` `stateDiagram-v2` |
| A number before and after | `::stats` or `:delta` |
| A share of a whole | `:progress` |
| Findings, options, or decisions compared across the same columns | Table of at most five columns, `:badge` for categories and verdicts |
| Detail per item | `::accordion`, one item per row, the same parts inside every item |
| What you left out | Bar chart of the largest, then `::accordion` grouped by reason |
| How you checked | `> [!CAUTION]` for what you didn't verify, kept open; sources in `::details` |

A table cell holds a value, a badge, or a few words. The reasoning behind a cell goes in that item's accordion. A column whose cells are all the same says one thing, so say it in the section's sentence and drop the column. Two charts that compare the same unit share one scale, so draw them as one chart, or fix the axis domain in both.

[references/blocks.md](references/blocks.md) has the syntax for each, with the gotchas the renderer doesn't report. The `comark-ui` skill documents every block in full.

Done when every section opens with its sentence and its picture, every number the answer rests on sits in a chart or a table column, and no table cell runs past a line or two at reading width.

## 4. Assemble the page

The two ends are fixed, and the middle holds the sections your material has, in the order the reader acts on them:

```text
Frontmatter    title = the answer in under 70 characters; status, date, tags
The answer     two sentences, the decisions in > [!IMPORTANT], at most one > [!WARNING]
Decisions      the decision table, only when there are more than three
  middle       from step 3, such as: the picture the answer rests on, findings,
               the order, blockers, before and after, each item, left out
How I checked  > [!CAUTION] open, sources folded
```

Keep open what the reader decides on, and fold what they would only check: each decision and your recommendation stay open in the callout or the decision table, and the arguments behind them fold. When each item fits one table row, the table is the item list and needs no accordion. Past about a dozen items, the table is the list, and only the items that need reasoning get an accordion item. Lists stay one level deep; a second level becomes a table. Cards are for links to the next pages only.

[references/example.md](references/example.md) is a full report in this shape: the answer and decision on top, a bubble chart, one order shown as a flowchart and a table, blockers sized by what they unlock, one accordion item per module with the same parts, the left-out chart with its groups, and the open "Not verified" callout.

Done when the page follows this order and nothing the reader decides on is folded.

## 5. Check the render

1. Lint it, and fix until it reports no problems:

   ```sh
   vp dlx --package comark-linter --package comark-ui comark-lint report.md
   ```

   These commands use the [global Vite+ CLI](https://viteplus.dev/guide/global-cli). Without it, `pnpm dlx` takes the same arguments.

2. Render it as [references/blocks.md](references/blocks.md#render-it-locally) shows, and read every screenshot, closed and open. Labels must not overlap, each chart must say what its sentence says, table cells must stay short, and diagram text must read at the size of the body text. A wide flowchart renders small: switch it to `TB`, shorten its labels, or split it past about ten nodes.
3. Hand it over where the task says. When it goes to a host such as Drop, publish it as the host's skill describes and give the link.

Done when lint reports no problems and you've read every screenshot of the render.
