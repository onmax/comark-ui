Each label has one note. When two `[^label]: …` lines share a label, the first one shows and the second is dropped, so every reference to that label points at the first. Give each note its own label.

::incorrect
```md
The ducks moved ponds[^1] after the pigeons arrived.[^1]

[^1]: The old pond froze.
[^1]: The pigeons took the bread.
```
::

::correct
```md
The ducks moved ponds[^1] after the pigeons arrived.[^2]

[^1]: The old pond froze.
[^2]: The pigeons took the bread.
```
::
