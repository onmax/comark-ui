`at` moves a side note along its margin, and `to` aims its arrow. Without a `side` there's no note in the margin and no arrow, so neither has anything to place.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 mark="circle" at=60 to="27,35"}
The duck without a name tag.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 mark="none" side="top" at=60 to="27,35"}
The duck without a name tag.
:::
::
```
::
