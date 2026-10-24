Notes on one side line up with their marks. When two marks on the same side sit close together, their notes would cover each other. The text can't be measured while parsing, so the plugin goes by the distance between the marks; check the rendered page too.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=10 y=10 w=10 h=10 side="left"}
The first duck in line.
:::
:::annotation{x=10 y=15 w=10 h=10 side="left"}
The second duck in line.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=10 y=10 w=10 h=10 side="left"}
The first duck in line.
:::
:::annotation{x=10 y=15 w=10 h=10 side="right"}
The second duck in line.
:::
::
```
::
