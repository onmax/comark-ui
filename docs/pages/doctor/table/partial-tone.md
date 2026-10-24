A `tone` span colors its cell only when it is the whole cell, and its row when it is the whole first cell. A span next to other text, or inside bold or a link, colors nothing. Put the whole cell in the brackets.

::incorrect
```md
| Pond | Ducks |
| --- | --- |
| Mill pond | [14]{tone="success"} today |
```
::

::correct
```md
| Pond | Ducks |
| --- | --- |
| Mill pond | [14 today]{tone="success"} |
```
::
