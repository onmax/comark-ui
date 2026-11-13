Only an image alone in its paragraph becomes a numbered figure, since a caption can't sit in the middle of a sentence. A labeled image with text around it stays an image, so it gets no number, and a `:ref` to it finds nothing.

::incorrect
```md
The ducks swim here ![The duck pond](/pond.svg){#fig-pond} every morning.
```
::

::correct
```md
The ducks swim in the pond every morning.

![The duck pond](/pond.svg){#fig-pond}
```
::
