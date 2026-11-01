---
title: Chart plugins compared
description: comark-charts next to comark-vega and comark-flint-chart, the other chart plugins for Comark.
keywords: Vega, Vega-Lite, Flint, alternatives, comparison, vs
tagline: Three Comark plugins draw charts with Vega. In comark-charts you write a Markdown table, so one block serves the people who look at the chart and the agents who read its numbers.
---

## One block, two readers

People look at the chart. Agents read the numbers, in the Markdown when they write it and in the page when they check it. A drawing is a poor source of numbers. Its bars are paths, its labels show only the values that fit, and the rest hide in its attributes.

So a `::chart` holds a Markdown table. The renderer draws the chart and keeps the table in the page, in the **Data** toggle under it. The agent writes a table, the person sees a chart, and either can check a number against the other.

::example
```md
::chart{title="Pizza slices per merged pull request"}
| team | slices |
| --- | --: |
| backend | 4.1 |
| design | 1.2 |
| frontend | 1.8 |
::
```
::

The other two plugins draw it from a JSON spec, and the page holds only the drawing:

::code-group
````md [comark-vega]
::vl
```
{
  "mark": "bar",
  "data": {
    "values": [
      { "team": "backend", "slices": 4.1 },
      { "team": "design", "slices": 1.2 },
      { "team": "frontend", "slices": 1.8 }
    ]
  },
  "encoding": {
    "x": { "field": "team", "type": "nominal" },
    "y": { "field": "slices", "type": "quantitative", "title": "slices per PR" }
  }
}
```
::
````

````md [comark-flint-chart]
```flint
{
  "data": {
    "values": [
      { "team": "backend", "slices": 4.1 },
      { "team": "design", "slices": 1.2 },
      { "team": "frontend", "slices": 1.8 }
    ]
  },
  "semantic_types": { "team": "Category", "slices": "Quantity" },
  "chart_spec": {
    "chartType": "Bar Chart",
    "encodings": { "x": { "field": "team" }, "y": { "field": "slices" } }
  }
}
```
````
::

## At a glance

::matrix
| | [comark-charts](/charts/) | [comark-vega](https://github.com/miguelrk/comark-packages/tree/main/packages/comark-vega) | [comark-flint-chart](https://github.com/miguelrk/comark-packages/tree/main/packages/comark-flint-chart) |
| --- | --- | --- | --- |
| **Writing** | | | |
| Source *What goes in the Markdown* | A table | Vega-Lite JSON | Flint JSON |
| Numbers in the page *What an agent reads back* | ✓ The table | — | — |
| Marks *A note pointing at a bar or a point* | ✓ comark-annotate | In the spec | — |
| Frontmatter data *A spec bound with `:spec`* | — | ✓ | ✓ |
| **Drawing** | | | |
| Layout *Who picks the axes, scales, and labels* | Flint | You | Flint |
| Chart types | Eight common ones, or any Vega-Lite chart over the table | Any Vega chart | Flint's templates |
| Engine | Vega | Vega | Vega or ECharts |
| **Output** | | | |
| Format | SVG | SVG, image, or Vue component | SVG, image, or Vue component |
| Renderers *SVG renders in any of them* | HTML, Vue, React, and Svelte; marks in HTML | Any, or `@comark/vue` | Any, or `@comark/vue` |
| **Checks** | | | |
| Errors *What a broken block does* | ✓ An issue that says how to fix it | A `<pre>` for parse-time invalid JSON/assembly | `.flint-error` for Vue render failures; `<pre>` for parse-time invalid JSON/assembly |
| Cloudflare Workers *Vega needs `vega-interpreter` there* | ✓ | — | Vega/Vega-Lite SVG path: —; ECharts SSR: ✓ |
::

## Which to use

Use comark-charts for documents that agents write or check, such as pull request evidence and reports. The table is the source and stays in the page. comark-charts lays out the common chart types itself and draws any other from a Vega-Lite spec over the same table.

Use [comark-vega](https://github.com/miguelrk/comark-packages/tree/main/packages/comark-vega) for full Vega specs, data that isn't a table, such as maps, or interactive charts in a Vue app.

Use [comark-flint-chart](https://github.com/miguelrk/comark-packages/tree/main/packages/comark-flint-chart) for Flint's layouts in a Vue app, or for charts drawn with ECharts.
