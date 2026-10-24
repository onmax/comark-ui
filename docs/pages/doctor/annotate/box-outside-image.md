A box that runs past the right or bottom edge of the image is cut off there, and its number can hang outside the image. This usually means the box was measured on a different capture. Keep `x + w` and `y + h` within 100.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=90 y=30 w=20 h=10}
The duck at the far bank.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=80 y=30 w=20 h=10}
The duck at the far bank.
:::
::
```
::
