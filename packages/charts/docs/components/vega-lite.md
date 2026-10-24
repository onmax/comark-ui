---
title: vega-lite
description: Any chart the types don't cover, from a Vega-Lite spec that reads the table.
---

For a chart the types don't cover, such as a box plot, a heatmap, or error bands, put a [Vega-Lite](https://vega.github.io/vega-lite/) spec after the table in a `vega-lite` block. The table is still its data, so it stays in the page. Each row becomes one data point, with a field per column named by its header.

::example
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
::

Leave `data` out of the spec, because the table replaces it. Cells that read as numbers become numbers, empty ones become null, and the rest stay text.

The chart takes the same colors and type as the other charts wherever the spec sets none, and the spec's own `config` wins. `type`, `x`, `y`, and marks don't apply. Name the columns in the spec's `encoding` instead, and draw notes with a `text` or `rule` layer.

## Validation

The plugin reports a spec that isn't one JSON object, a `data` the table replaces, a field that's neither a column nor made by a transform, and a spec Vega-Lite can't draw. It also reports `type`, `x`, `y`, or an `::annotation` on a chart drawn from a spec. The spec can't load files or URLs, and the plugin drops links in it.
