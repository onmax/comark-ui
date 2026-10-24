`::palette` draws one tile per line of a list, bulleted or numbered. A block without a list has nothing to draw, so it renders an empty grid.

::incorrect
```md
::palette
Pond blue is #3b82f6 and duck yellow is #facc15.
::
```
::

::correct
```md
::palette
- Pond blue: #3b82f6
- Duck yellow: #facc15
::
```
::
