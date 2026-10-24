`:include` takes `src`, `lines`, `region`, `code`, and `lang`. An include with any other option is dropped rather than pasted with it ignored, since a misspelled `lines` would otherwise paste the whole file.

::incorrect
```md
:include{src="deploy.sh" line="3:3"}
```
::

::correct
```md
:include{src="deploy.sh" lines="3:3"}
```
::
