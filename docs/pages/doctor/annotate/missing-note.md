An annotation's content is its note. Without one, the mark has a number and nothing to say, and readers have to guess why it's there.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10}
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
