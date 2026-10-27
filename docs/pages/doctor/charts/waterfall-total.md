A waterfall's first row is its start total and its last row its end total, with the changes between them. The end total must be the start plus every change, so a reader can check one against the other. A total that doesn't add up usually means a missing change, or a last change written where the end total belongs.

::incorrect
```md
::chart{type="waterfall" title="Rubber ducks in the office"}
| step | ducks |
| --- | --: |
| July | 41 |
| bulk order | 12 |
| taken home | -4 |
::
```
::

::correct
```md
::chart{type="waterfall" title="Rubber ducks in the office"}
| step | ducks |
| --- | --: |
| July | 41 |
| bulk order | 12 |
| taken home | -4 |
| October | 49 |
::
```
::
