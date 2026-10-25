---
title: Vega-Lite
description: Any chart the types don't cover, from a Vega-Lite spec that reads the table.
keywords: box plot, heatmap, error bands, custom chart
tagline: Any chart the types don't cover, drawn from a Vega-Lite spec over the table.
---

::examples
:::example{label="Box plot"}
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
:::
::

## Features

- The table is the spec's data, so the numbers stay in the page.
- Cells that read as numbers become numbers, empty ones become null, and the rest stay text.
- The chart takes the same colors and typeface as the other charts wherever the spec sets none.
- The spec can't load files or URLs.

## Usage

For a chart the types don't cover, such as a box plot, a heatmap, or error bands, put a [Vega-Lite](https://vega.github.io/vega-lite/) spec after the table in a `vega-lite` block. The table is still its data, so it stays in the page. Each row becomes one data point, with a field per column named by its header.

Leave `data` out of the spec, because the table replaces it. Name the columns in the spec's `encoding`.

````md
::chart{title="Latency per request (ms)"}
| endpoint | ms |
| --- | --: |
| /search | 120 |
| /login | 40 |

```vega-lite
{ "mark": "bar", "encoding": { "x": { "field": "ms", "type": "quantitative" }, "y": { "field": "endpoint", "type": "nominal" } } }
```
::
````

### Config

Use the spec's own `config` to change colors or typeface. It wins over the chart's.

### Notes

Draw notes with a `text` or `rule` layer in the spec. `type`, `x`, `y`, and annotations don't apply to a chart drawn from a spec.

## API

### Props

A chart drawn from a spec takes only `title` from the chart's [props](/charts/#props).

### Issues

The plugin adds these problems to `meta.issues`:

- The spec isn't one JSON object.
- The spec has a `data`, which the table replaces.
- A field is neither a column nor made by a transform.
- Vega-Lite can't draw the spec.
- The chart has `type`, `x`, `y`, or an `::annotation`.

The plugin drops links in the spec. Each problem has its own rule in [Doctor](/doctor/).
