A `::file-tree` with no fenced block, or with an empty one, has no entries to draw, so it renders nothing. This usually means the tree was written outside the block, or the closing `::` came too soon.

::incorrect
````md
::file-tree
```
```
::
````
::

::correct
````md
::file-tree
```
ducks/
  feed.ts
  deploy.sh
```
::
````
::
