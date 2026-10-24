`::sources` reads its sources from a numbered list, one link per item, and the citations point at the items by number. A block with no numbered list has nothing to cite, so every `:cite` in the document points at nothing.

::incorrect
```md
::sources
- [Homing](https://en.wikipedia.org/wiki/Homing_pigeon)
::
```
::

::correct
```md
::sources
1. [Homing](https://en.wikipedia.org/wiki/Homing_pigeon)
::
```
::
