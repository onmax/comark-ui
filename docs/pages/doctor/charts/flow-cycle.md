A sankey runs one way, from its first column to its last, so a flow back into a node it came from has no column to land in, and the chart shows its table instead. Remove the flow that closes the loop, or split the node in two, such as what comes in and what goes out.

::incorrect
```md
::chart{type="sankey" title="Ducks between ponds"}
| from | to | ducks |
| --- | --- | --: |
| north | south | 12 |
| south | north | 4 |
::
```
::

::correct
```md
::chart{type="sankey" title="Ducks between ponds"}
| from | to | ducks |
| --- | --- | --: |
| north (spring) | south (summer) | 12 |
| south (spring) | north (summer) | 4 |
::
```
::
