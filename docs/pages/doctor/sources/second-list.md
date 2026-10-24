A document has one list of sources, and every `:cite` points into the first. A second `::sources` is left empty, so its links never reach the reader, and a citation meant for one of them points past the end of the first list.

::incorrect
```md
Pigeons home by the sun :cite[1].

::sources
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
::

They may smell their way too.

::sources
1. [Pigeon intelligence](https://en.wikipedia.org/wiki/Pigeon_intelligence)
::
```
::

::correct
```md
Pigeons home by the sun :cite[1] and by smell :cite[2].

::sources
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
2. [Pigeon intelligence](https://en.wikipedia.org/wiki/Pigeon_intelligence)
::
```
::
