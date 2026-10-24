`:include` reads the file named in `src`. Without it there's nothing to read, so the include is dropped and the page has a gap where the file should be.

::incorrect
```md
:include{path="ducks.md"}
```
::

::correct
```md
:include{src="ducks.md"}
```
::
