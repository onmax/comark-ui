`:icon` draws the icon `name` names, so one without it has nothing to draw and is left out of the page.

::incorrect
```md
The pond opens at noon :icon{label="Duck"}
```
::

::correct
```md
The pond opens at noon :icon{name="lucide:bird" label="Duck"}
```
::
