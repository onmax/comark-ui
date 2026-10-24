The file exists but couldn't be read: it's a folder, the build may not read it, or a custom `read` option threw. The include is dropped, and the message ends with the error the reader gave.

::incorrect
```md
:include{src="ponds"}
```
::

::correct
```md
:include{src="ponds/north.md"}
```
::
