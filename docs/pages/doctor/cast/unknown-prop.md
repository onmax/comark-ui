`::cast` reads `src`, `mode`, and `title`, and ignores every other prop. A misspelled `title` leaves the terminal without its caption.

::incorrect
```md
::cast{src="deploy.cast" titel="pnpm deploy"}
::
```
::

::correct
```md
::cast{src="deploy.cast" title="pnpm deploy"}
::
```
::
