The values are percentages, so `x=0.25` is a quarter of one percent of the image, not a quarter of it. A box written as fractions shrinks to a speck in the top left corner. Multiply each value by 100.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=0.2 y=0.3 w=0.15 h=0.1}
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
