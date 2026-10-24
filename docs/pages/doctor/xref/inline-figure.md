Only an image alone in its paragraph becomes a numbered figure, since a caption can't sit in the middle of a sentence. A labeled image with text around it stays an image, so it gets no number, and a `:ref` to it finds nothing.

::incorrect
```md
The pigeons land here ![The roof after the deploy](roof.png){#fig-roof} every morning.
```
::

::correct
```md
The pigeons land on the roof every morning.

![The roof after the deploy](roof.png){#fig-roof}
```
::
