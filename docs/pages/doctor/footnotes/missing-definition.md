A reference like `[^ducks]` needs a `[^ducks]: …` line somewhere in the document. Without one, the reference renders as the literal text `[^ducks]` and no note is listed at the end. When the definition is there but its label is spelled differently, `unused-definition` reports it too.

::incorrect
```md
The pond holds twelve ducks.[^ducks]
```
::

::correct
```md
The pond holds twelve ducks.[^ducks]

[^ducks]: Counted on Sunday morning.
```
::
