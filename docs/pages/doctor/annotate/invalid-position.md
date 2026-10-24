`x`, `y`, `w`, and `h` place an annotation's box as percentages of the image: `x` and `y` from its top left corner, `w` and `h` its width and height. Each is required and is a plain number, so a missing one or one with `%` or `px` leaves the box out of place.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x="20%" y=30 w=15 h=10}
The duck without a name tag.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10}
The duck without a name tag.
:::
::
```
::
