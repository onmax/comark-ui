A cell's `tone` is one of `success`, `warning`, `error`, and `info`, the words comark-badge uses. Any other word leaves the cell uncolored, and the span renders as its text.

::incorrect
```md
| Pond | Ducks |
| --- | --- |
| Mill pond | [0]{tone="red"} |
```
::

::correct
```md
| Pond | Ducks |
| --- | --- |
| Mill pond | [0]{tone="error"} |
```
::
