A chart drawn from a Vega-Lite spec takes its mark and its columns from the spec, so `type`, `x`, and `y` on the block are ignored. Only `title` still applies. Name the columns in the spec's `encoding`.

::incorrect
````md
::chart{type="bar" title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |

```vega-lite
{
  "mark": "bar",
  "encoding": {
    "x": { "field": "pond", "type": "nominal" },
    "y": { "field": "ducks", "type": "quantitative" }
  }
}
```
::
````
::

::correct
````md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |

```vega-lite
{
  "mark": "bar",
  "encoding": {
    "x": { "field": "pond", "type": "nominal" },
    "y": { "field": "ducks", "type": "quantitative" }
  }
}
```
::
````
::
