Once a `::carousel` holds a `:::slide`, only its slides are shown. Anything else inside it is dropped from the page, so a paragraph written between two slides, or after the last one, never reaches the reader.

::incorrect
```md
::carousel{title="Pond tour"}
:::slide{title="North bank"}
Two ducks nest by the reeds.
:::

The pigeons left at noon.
::
```
::

::correct
```md
::carousel{title="Pond tour"}
:::slide{title="North bank"}
Two ducks nest by the reeds.
:::

:::slide{title="Roof"}
The pigeons left at noon.
:::
::
```
::
