`lines` and `region` each pick part of a file, and they can't be combined, so an include with both is dropped. Keep the one that says what you want: `region` keeps working when lines are added above it.

::incorrect
```md
:include{src="deploy.sh" lines="3:3" region="build"}
```
::

::correct
```md
:include{src="deploy.sh" region="build"}
```
::
