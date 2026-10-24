A `::tabs` with no `:::tabs-item` inside, or a `::code-group` with no code blocks, has nothing to show, so the page gets an empty box.

::incorrect
```md
::tabs
::
```
::

::correct
```md
::tabs
:::tabs-item{label="North pond"}
14 ducks.
:::
::
```
::
