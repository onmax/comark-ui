Every row of a sankey is a flow from one node to another, as wide as its amount. A flow of 0 or less has no width to draw, and one from a node into itself has nowhere to go, so the chart leaves them out. For a flow the other way, swap its two nodes and drop the sign.

::incorrect
```md
::chart{type="sankey" title="Budget ($)"}
| from | to | amount |
| --- | --- | --: |
| salary | budget | 3,000 |
| budget | rent | 1,200 |
| budget | refund | -50 |
::
```
::

::correct
```md
::chart{type="sankey" title="Budget ($)"}
| from | to | amount |
| --- | --- | --: |
| salary | budget | 3,000 |
| refund | budget | 50 |
| budget | rent | 1,200 |
::
```
::
