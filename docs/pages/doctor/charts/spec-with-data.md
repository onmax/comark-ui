A chart's data is its table, which stays in the page so readers and agents can read the numbers. The table replaces any `data` in the spec, so numbers written there are never drawn.

::incorrect
````md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |

```vega-lite
{
  "data": { "values": [{ "pond": "north", "ducks": 12 }] },
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
