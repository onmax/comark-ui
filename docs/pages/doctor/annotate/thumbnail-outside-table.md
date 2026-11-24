`:screenshot{of="pond"}` moves a screenshot into a table cell and draws it as a thumbnail. Outside a table there is room for the screenshot itself, so the name draws nothing and the block stays where it was written.

::incorrect
```md
The pond, seen from above: :screenshot{of="pond"}

::screenshot{#pond src="/pond.svg" alt="The pond map with three ducks"}
::
```
::

::correct
```md
The pond, seen from above:

::screenshot{#pond src="/pond.svg" alt="The pond map with three ducks"}
::
```
::
