A `:::tabs-item` is a tab only inside `::tabs`. Anywhere else it renders as plain content, and its label isn't shown. It usually means the `::tabs` fence around it is missing or closed too early.

::incorrect
```md
:::tabs-item{label="North pond"}
14 ducks.
:::
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
