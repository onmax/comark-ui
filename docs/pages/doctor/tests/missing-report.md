`::tests` shows a JUnit report, read from the file in `src` or from one `xml` fence inside the block. With neither, it has nothing to count and renders nothing.

::incorrect
```md
::tests{title="Pond tests"}
::
```
::

::correct
```md
::tests{src="junit.xml" title="Pond tests"}
::
```
::
