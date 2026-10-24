An `::annotation` marks a spot on the screenshot it sits in. Outside one, it has nothing to point at, and it renders as a plain block.

::incorrect
```md
::annotation{x=20 y=30 w=15 h=10}
The duck without a name tag.
::

::screenshot{src="/pond.png" alt="The pond map with three ducks"}
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
