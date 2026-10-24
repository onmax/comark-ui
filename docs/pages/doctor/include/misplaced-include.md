An include is pasted only when it sits alone on its own line. One inside a sentence is dropped. One written `::include`, with two colons, opens a block that takes in the rest of the page.

::incorrect
```md
The count is in :include{src="ducks.md"} this week.
```
::

::correct
```md
The count is in this week:

:include{src="ducks.md"}
```
::
