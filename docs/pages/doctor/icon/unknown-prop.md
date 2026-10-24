`:icon` reads `name` and `label`, and ignores every other prop. An `alt` or `title` meant to name the icon leaves it unnamed, so screen readers skip it. An icon takes its size and color from the text around it.

::incorrect
```md
The pond opens at noon :icon{name="lucide:bird" alt="Duck"}
```
::

::correct
```md
The pond opens at noon :icon{name="lucide:bird" label="Duck"}
```
::
