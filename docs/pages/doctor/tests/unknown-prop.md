`::tests` reads `src` and `title`, and ignores every other prop. A misspelled `title` leaves the summary without its heading.

::incorrect
```md
::tests{src="junit.xml" titel="Pond tests"}
::
```
::

::correct
```md
::tests{src="junit.xml" title="Pond tests"}
::
```
::
