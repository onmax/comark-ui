`::tabs` and `::code-group` read `sync`, and `:::tabs-item` reads `label` and `icon`. Every other prop is ignored, so a misspelled `sync` leaves the block switching on its own, and a `default` or `active` doesn't change which tab shows first.

::incorrect
```md
::tabs{sycn="pond"}
:::tabs-item{label="North pond"}
14 ducks.
:::
::
```
::

::correct
```md
::tabs{sync="pond"}
:::tabs-item{label="North pond"}
14 ducks.
:::
::
```
::
