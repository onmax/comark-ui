`::carousel` reads `title`, `columns`, and `zoom`, and `:::slide` reads `title`. Every other prop is ignored, so a misspelled one changes nothing: `cols=2` still shows one slide at a time.

::incorrect
```md
::carousel{title="Pond tour" cols=2}
Two ducks nest by the reeds.

The pigeons left at noon.
::
```
::

::correct
```md
::carousel{title="Pond tour" columns=2}
Two ducks nest by the reeds.

The pigeons left at noon.
::
```
::
