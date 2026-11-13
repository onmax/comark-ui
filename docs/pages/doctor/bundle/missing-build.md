A `::bundle` reads the builds it compares from its props, so one with none of them has nothing to draw and renders nothing. Point `before` and `after` at two build folders or two Sonda reports, or `src` at one.

::incorrect
```md
::bundle{title="Upgrade the dashboard"}
::
```
::

::correct
```md
::bundle{before="reports/main.json" after="reports/pr.json" title="Upgrade the dashboard"}
::
```
::
