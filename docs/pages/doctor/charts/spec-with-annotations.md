comark-charts places annotations on the charts it lays out, and it can't find a row's shape in one Vega-Lite draws, so they aren't drawn. Draw the note in the spec instead, as a `text` or `rule` layer.

::incorrect
````md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |

:::annotation{at="north"}
A family of eight moved in on Tuesday.
:::

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
  "layer": [
    { "mark": "bar" },
    {
      "mark": { "type": "text", "dy": -8 },
      "transform": [{ "filter": "datum.pond === 'north'" }],
      "encoding": { "text": { "value": "A family moved in" } }
    }
  ],
  "encoding": {
    "x": { "field": "pond", "type": "nominal" },
    "y": { "field": "ducks", "type": "quantitative" }
  }
}
```
::
````
::
