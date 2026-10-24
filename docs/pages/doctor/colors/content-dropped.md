`::palette` renders only its list, so a paragraph, heading, or second block inside it is dropped. Write it before or after the palette.

::incorrect
```md
::palette
The colors of the duck pond.

- Pond blue: #3b82f6
- Duck yellow: #facc15
::
```
::

::correct
```md
The colors of the duck pond.

::palette
- Pond blue: #3b82f6
- Duck yellow: #facc15
::
```
::
