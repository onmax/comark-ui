`::bundle` reads `before`, `after`, `src`, and `title`. Any other prop is ignored, which usually means a typo or a prop from another tool.

::incorrect
```md
::bundle{before="builds/main/assets" after="builds/pr/assets" gzip="9"}
::
```
::

::correct
```md
::bundle{before="builds/main/assets" after="builds/pr/assets"}
::
```
::
