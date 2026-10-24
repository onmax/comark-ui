`mark="none"` draws nothing on the image and leaves the pointing to a side note's arrow. Without a `side`, the note sits in the list under the image and nothing shows what it's about.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 mark="none"}
The duck without a name tag.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 mark="none" side="left"}
The duck without a name tag.
:::
::
```
::
