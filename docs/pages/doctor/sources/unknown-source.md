A citation's number is its source's place in the `::sources` list. A number past the end of the list, or a citation in a document with no list, points at nothing, so it renders as plain text instead of a link. This happens when sources are removed or reordered and the numbers in the text drift.

::incorrect
```md
Ducks sleep with one eye open :cite[2].

::sources
1. [Unihemispheric sleep](https://en.wikipedia.org/wiki/Unihemispheric_slow-wave_sleep)
::
```
::

::correct
```md
Ducks sleep with one eye open :cite[1].

::sources
1. [Unihemispheric sleep](https://en.wikipedia.org/wiki/Unihemispheric_slow-wave_sleep)
::
```
::
