`:ref` reads the id it points at from `{#...}`. Without one, it has nothing to number and renders as `[?]`. Writing the label without its `#` makes it a prop instead of an id, so the reference still names nothing.

::incorrect
```md
![Three ducks on the pond](ducks.png){#fig-ducks}

As :ref{fig-ducks} shows, the ducks stay near the reeds.
```
::

::correct
```md
![Three ducks on the pond](ducks.png){#fig-ducks}

As :ref{#fig-ducks} shows, the ducks stay near the reeds.
```
::
