A bar ends after it starts. An end before its start is usually two cells swapped, or a typo in one. The chart still draws the bar between them, so the mistake is easy to miss.

::incorrect
```md
::chart{type="gantt" title="Duckling season"}
| stage | start | end |
| --- | --- | --- |
| nesting | 2026-04-01 | 2026-04-20 |
| hatching | 2026-05-18 | 2026-04-20 |
| first swim | 2026-05-19 | 2026-05-19 |
::
```
::

::correct
```md
::chart{type="gantt" title="Duckling season"}
| stage | start | end |
| --- | --- | --- |
| nesting | 2026-04-01 | 2026-04-20 |
| hatching | 2026-04-20 | 2026-05-18 |
| first swim | 2026-05-19 | 2026-05-19 |
::
```
::
