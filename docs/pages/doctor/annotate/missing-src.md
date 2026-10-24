A `::screenshot` without `src` has no image, so its marks and notes point at nothing.

::incorrect
```md
::screenshot{alt="The pond map with three ducks"}
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
::
```
::
