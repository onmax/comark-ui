The `vega-lite` block is read as JSON, and it must be one object. A trailing comma, a comment, or a key without quotes stops it from parsing, and the block shows the table and the spec as they are.

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
    "y": { "field": "ducks", "type": "quantitative" },
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
