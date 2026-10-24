Readers pick a tab by its label, and `sync` matches tabs across blocks by label too, so two tabs with one label can't be told apart.

::incorrect
```md
::tabs
:::tabs-item{label="Pond"}
14 ducks.
:::

:::tabs-item{label="Pond"}
3 pigeons.
:::
::
```
::

::correct
```md
::tabs
:::tabs-item{label="North pond"}
14 ducks.
:::

:::tabs-item{label="South pond"}
3 pigeons.
:::
::
```
::
