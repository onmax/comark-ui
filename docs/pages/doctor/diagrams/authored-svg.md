A diagram's `svg` is what comark-diagrams writes after Kroki draws a fence and the SVG is cleaned, so the renderers print it as it is. A `::diagram` written by hand with its own `svg` is ignored, and the diagram renders nothing. Write the diagram as a fence instead.

::incorrect
```md
::diagram{svg="<svg viewBox='0 0 10 10'></svg>"}
::
```
::

::correct
````md
```d2
duck -> pond
```
````
::
