`::file-tree` takes no props: every line of the tree comes from its fenced block. A prop such as `title` is ignored, so the heading it was meant to give the tree never shows. Write it as text before the block.

::incorrect
````md
::file-tree{title="The pond service"}
```
pond/
  ducks.ts
```
::
````
::

::correct
````md
The pond service:

::file-tree
```
pond/
  ducks.ts
```
::
````
::
