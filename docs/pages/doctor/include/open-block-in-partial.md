A partial that opens a `::` block and never closes it would take in the rest of the page, so comark-include closes it at the end of the paste and reports it. Close the block in the partial instead of relying on that. Here `tour.md` opens `::carousel` without its closing `::`, and `tour-closed.md` has it.

::incorrect
```md
:include{src="tour.md"}
```
::

::correct
```md
:include{src="tour-closed.md"}
```
::
