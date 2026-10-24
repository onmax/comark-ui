`:include` reads files under its `root` while the page builds, and never downloads one. An include whose `src` is a URL is dropped. Copy the file into the project, or link to it instead.

::incorrect
```md
:include{src="https://example.com/ducks.md"}
```
::

::correct
```md
:include{src="ducks.md"}
```
::
