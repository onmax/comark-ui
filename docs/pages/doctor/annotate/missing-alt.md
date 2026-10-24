`alt` is what a screen reader says for the screenshot, and what shows when the image doesn't load. Without it, a reader who can't see the image doesn't know what the marks are on. Write what the screenshot shows.

::incorrect
```md
::screenshot{src="/pond.png"}
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
::
```
::
