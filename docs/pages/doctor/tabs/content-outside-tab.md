`::tabs` renders only its `:::tabs-item` blocks, so anything written between them, or before the first, is dropped from the page. It usually means a tab's closing `:::` came too early.

::incorrect
```md
::tabs
Count the ducks before standup.

:::tabs-item{label="North pond"}
14 ducks.
:::
::
```
::

::correct
```md
Count the ducks before standup.

::tabs
:::tabs-item{label="North pond"}
14 ducks.
:::
::
```
::
