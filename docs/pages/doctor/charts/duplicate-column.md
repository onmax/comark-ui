`x`, `y`, and annotations find columns by their header, so two columns with the same header can't be told apart. The block shows the table alone. This is usually a copied header that wasn't changed.

::incorrect
```md
::chart{title="Ducks per pond"}
| pond | 2025 | 2025 |
| --- | --: | --: |
| north | 12 | 15 |
| south | 7 | 6 |
| east | 9 | 11 |
::
```
::

::correct
```md
::chart{title="Ducks per pond"}
| pond | 2025 | 2026 |
| --- | --: | --: |
| north | 12 | 15 |
| south | 7 | 6 |
| east | 9 | 11 |
::
```
::
