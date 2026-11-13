`src` shows one build, and `before` and `after` compare two. A `::bundle` with both renders nothing, since it can't tell which you meant. Keep `before` and `after` to compare, or `src` alone.

::incorrect
```md
::bundle{src="builds/pr/assets" before="builds/main/assets"}
::
```
::

::correct
```md
::bundle{before="builds/main/assets" after="builds/pr/assets"}
::
```
::
