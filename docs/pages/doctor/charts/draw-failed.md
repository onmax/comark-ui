The spec parsed, but Vega-Lite couldn't draw it, such as a `mark` it doesn't have. The block shows the table alone, and the message gives Vega-Lite's error. comark-linter doesn't draw charts, so only parsing with comark-charts reports this.

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
  "mark": "pie",
  "encoding": {
    "theta": { "field": "ducks", "type": "quantitative" },
    "color": { "field": "pond", "type": "nominal" }
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
  "mark": "arc",
  "encoding": {
    "theta": { "field": "ducks", "type": "quantitative" },
    "color": { "field": "pond", "type": "nominal" }
  }
}
```
::
````
::
