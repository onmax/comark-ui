A node in the middle of a sankey passes on what flows into it, so it can't send out more. When it does, a flow into it is usually missing, or an amount is wrong. The chart still draws it, as tall as its larger side.

::incorrect
```md
::chart{type="sankey" title="Budget ($)"}
| from | to | amount |
| --- | --- | --: |
| salary | budget | 3,000 |
| budget | rent | 1,200 |
| budget | savings | 2,000 |
::
```
::

::correct
```md
::chart{type="sankey" title="Budget ($)"}
| from | to | amount |
| --- | --- | --: |
| salary | budget | 3,000 |
| freelance | budget | 200 |
| budget | rent | 1,200 |
| budget | savings | 2,000 |
::
```
::
