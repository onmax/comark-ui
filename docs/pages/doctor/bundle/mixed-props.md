`src` shows one build, and `before` and `after` compare two. A `::bundle` with both renders nothing, since it can't tell which you meant. Keep `before` and `after` to compare, or `src` alone.

::incorrect
```md
::bundle{src="reports/pr.json" before="reports/main.json"}
::
```
::

::correct
```md
::bundle{before="reports/main.json" after="reports/pr.json"}
::
```
::
