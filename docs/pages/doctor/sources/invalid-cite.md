`:cite` holds the numbers of the sources it cites, such as `:cite[2]` or `:cite[1,3]`. A marker with anything else inside, or nothing, can't link to a source, so it renders nothing and the claim it backs loses its citation.

::incorrect
```md
Pigeons find home by the sun :cite[Magnetoreception].

::sources
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
::
```
::

::correct
```md
Pigeons find home by the sun :cite[1].

::sources
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
::
```
::
