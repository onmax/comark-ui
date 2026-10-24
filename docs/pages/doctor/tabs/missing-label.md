A tab shows its `label`, so a tab without one is named "Tab 1", and a code block in a `::code-group` without one is named by its language. In a code group, the label goes in brackets after the language, as in `sh [pnpm]`.

::incorrect
```md
::tabs
:::tabs-item
14 ducks.
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
::
```
::
