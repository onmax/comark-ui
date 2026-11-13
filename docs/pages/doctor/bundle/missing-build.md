A `::bundle` reads the builds it compares from its props, so one with none of them has nothing to draw and renders nothing. Point `before` and `after` at two build folders, or `src` at one.

::incorrect
```md
::bundle{title="Upgrade the dashboard"}
::
```
::

::correct
```md
::bundle{before="builds/main/assets" after="builds/pr/assets" title="Upgrade the dashboard"}
::
```
::
