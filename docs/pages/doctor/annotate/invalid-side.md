A side note sits to the left of the image, to its right, above it, or below it, with an arrow to its mark. Any other `side` puts the note in the numbered list under the image.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 side="under"}
The duck without a name tag.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 side="bottom"}
The duck without a name tag.
:::
::
```
::
