A table reads its file while the document parses, from the disk or the `read` option, and never downloads one. A `src` that is a URL renders nothing. Save the file next to the document instead.

::incorrect
```md
::table{src="https://example.com/ducks.csv"}
::
```
::

::correct
```md
::table{src="ducks.csv"}
::
```
::
