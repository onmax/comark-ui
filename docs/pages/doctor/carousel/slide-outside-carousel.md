A `:::slide` only means something inside a `::carousel`. On its own it renders as plain content with no frame, arrows, or zoom, which usually means the carousel around it was deleted or never written.

::incorrect
```md
:::slide{title="North bank"}
Two ducks nest by the reeds.
:::
```
::

::correct
```md
::carousel{title="Pond tour"}
:::slide{title="North bank"}
Two ducks nest by the reeds.
:::
::
```
::
