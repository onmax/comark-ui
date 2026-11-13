`::bundle` reads `before`, `after`, `src`, and `title`. Any other prop is ignored, which usually means a typo or a prop from another tool.

::incorrect
```md
::bundle{before="reports/main.json" after="reports/pr.json" gzip="9"}
::
```
::

::correct
```md
::bundle{before="reports/main.json" after="reports/pr.json"}
::
```
::
