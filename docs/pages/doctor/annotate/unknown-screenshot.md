A table cell shows a screenshot as a thumbnail by naming its block: `:screenshot{of="pond"}` draws the `::screenshot` whose id is `pond`. When no screenshot in the document has that id, the cell has nothing to draw and stays empty.

::incorrect
```md
| Duck | Where it swims |
| --- | --- |
| Mallard | :screenshot{of="pond"} |
```
::

::correct
```md
| Duck | Where it swims |
| --- | --- |
| Mallard | :screenshot{of="pond"} |

::screenshot{#pond src="/pond.svg" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10}
The mallard keeps to the reeds.
:::
::
```
::
