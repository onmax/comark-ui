A file that includes itself, directly or through other files, would paste forever. The include that closes the loop is dropped, and the rest of the file is pasted once. Here `loop.md` ends with `:include{src="loop.md"}`.

::incorrect
```md
:include{src="loop.md"}
```
::

::correct
```md
:include{src="ducks.md"}
```
::
