A `::details` shows its summary while it's closed, so readers decide from it whether to open it. Without `summary` or a `#summary` slot, it shows "Details", which says nothing about what's inside.

::incorrect
```md
::details
The ducks leave the pond at dusk.
::
```
::

::correct
```md
::details{summary="When do the ducks leave?"}
The ducks leave the pond at dusk.
::
```
::
