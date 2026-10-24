`::sources` reads `title`, the heading above the list, and ignores every other prop. A misspelled `title` leaves the list under the default heading, Sources.

::incorrect
```md
::sources{titel="Further reading"}
1. [Homing](https://en.wikipedia.org/wiki/Homing_pigeon)
::
```
::

::correct
```md
::sources{title="Further reading"}
1. [Homing](https://en.wikipedia.org/wiki/Homing_pigeon)
::
```
::
