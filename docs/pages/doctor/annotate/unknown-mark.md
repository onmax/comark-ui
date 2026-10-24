`mark` is what the annotation draws: `box`, `circle`, `underline`, `line`, `highlight`, `bracket`, `cross`, `check`, or `none`. Any other name draws a box.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 mark="arrow"}
The duck without a name tag.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 mark="circle"}
The duck without a name tag.
:::
::
```
::
