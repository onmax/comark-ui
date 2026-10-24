`::sources` renders only its numbered list, so a paragraph or heading written beside the list is dropped. Write it before or after the block instead.

::incorrect
```md
::sources
These are the papers on homing.

1. [Homing](https://en.wikipedia.org/wiki/Homing_pigeon)
::
```
::

::correct
```md
These are the papers on homing.

::sources
1. [Homing](https://en.wikipedia.org/wiki/Homing_pigeon)
::
```
::
