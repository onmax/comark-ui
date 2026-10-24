`::tests` reads only files under its `root` option, so a document can't show a file from anywhere else on the machine. A `src` with enough `../` to climb out of the root renders nothing. So does a `base` option that leaves it, for every block in the document.

Move the report under the root, or set `root` to a folder that holds it.

::incorrect
```md
::tests{src="../../deploys/junit.xml"}
::
```
::

::correct
```md
::tests{src="junit.xml"}
::
```
::
