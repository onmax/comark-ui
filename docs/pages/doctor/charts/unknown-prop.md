`::chart` reads `type`, `x`, `y`, and `title`, and an annotation inside it reads `at`, `series`, `mark`, `color`, and `side`. Any other prop is ignored, so a misspelled `title` leaves the chart without a caption, and screen readers name it by what it draws instead.

::incorrect
```md
::chart{titel="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::

::correct
```md
::chart{title="Ducks per pond"}
| pond | ducks |
| --- | --: |
| north | 12 |
| south | 7 |
| east | 9 |
::
```
::
