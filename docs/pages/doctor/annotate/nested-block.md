Screenshots, compares, and annotations are read only where they belong: an annotation as a direct child of a screenshot, and a screenshot or compare outside other notes and captions. One inside a note or a caption isn't read as part of the screenshot, so its mark isn't drawn.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10}
The duck without a name tag.

::::annotation{x=50 y=30 w=15 h=10}
The duck with two.
::::
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
:::annotation{x=50 y=30 w=15 h=10}
The duck with two.
:::
::
```
::
