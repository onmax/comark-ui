Each row of the table becomes one data point, with a field per column named by its header. A `field` that's neither a header nor made by a transform reads nothing, so its axis or its marks come out empty.

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
  "mark": "bar",
  "encoding": {
    "x": { "field": "pond", "type": "nominal" },
    "y": { "field": "duck", "type": "quantitative" }
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
