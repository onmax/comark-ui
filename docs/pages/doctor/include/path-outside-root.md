An include can't read anything outside its `root`, so a `src` that climbs out with `../`, or a symlink that leads out, is dropped. Otherwise a document could paste any file the build can read, such as a key in the home folder, into the page. The same goes for a `base` option that leaves the root.

::incorrect
```md
:include{src="../../package.json" code}
```
::

::correct
```md
:include{src="ducks.md"}
```
::
