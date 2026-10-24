`lines` is a range of line numbers, 1-based and inclusive, written with a colon: `lines="3:6"`, `lines="3:"` to the end, or `lines=":6"` from the top. A range written another way, or one that runs past the end of the file, drops the include.

::incorrect
```md
:include{src="deploy.sh" lines="2-4"}
```
::

::correct
```md
:include{src="deploy.sh" lines="2:4"}
```
::
