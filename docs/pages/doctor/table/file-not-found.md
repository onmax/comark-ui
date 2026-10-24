There's no file at the path `src` resolves to, so the table renders nothing. A relative `src` starts in the document's folder, the `base` option, and one that starts with `/` starts at the `root`. The message gives the path it looked for.

::incorrect
```md
::table{src="duks.csv"}
::
```
::

::correct
```md
::table{src="ducks.csv"}
::
```
::
