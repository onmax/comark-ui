`columns` shows two or three slides side by side on a wide page. Any other value is ignored, and the carousel shows one slide at a time.

::incorrect
```md
::carousel{title="Pond tour" columns=4}
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
