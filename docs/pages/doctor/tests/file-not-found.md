`::tests` reads `src` from the document's folder, or from the root when it starts with `/`. When nothing is there, the block renders nothing. The message gives the path it tried, which usually shows a typo or a report CI hasn't written yet.

::incorrect
```md
::tests{src="junit-pond.xml"}
::
```
::

::correct
```md
::tests{src="junit.xml"}
::
```
::
