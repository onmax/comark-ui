Each block reads its own props and ignores every other one, so a misspelled prop is dropped without a word. Here `colour` leaves the mark in the default color. The message suggests the prop you likely meant.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 colour="red"}
This duck has no name tag.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 color="red"}
This duck has no name tag.
:::
::
```
::
