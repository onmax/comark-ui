The file exists but couldn't be read: it's a folder, the build may not read it, or a custom `read` option threw. The cast renders nothing, and the message ends with the error the reader gave.

::incorrect
```md
::cast{src="ponds"}
::
```
::

::correct
```md
::cast{src="deploy.cast"}
::
```
::
