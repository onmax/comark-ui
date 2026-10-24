A `::carousel` with nothing inside it renders an empty frame. Usually its content went missing in an edit, or the closing `::` sits right after the opening line.

::incorrect
```md
::carousel{title="Pond tour"}
::
```
::

::correct
```md
::carousel{title="Pond tour"}
Two ducks nest by the reeds.

The pigeons left at noon.
::
```
::
