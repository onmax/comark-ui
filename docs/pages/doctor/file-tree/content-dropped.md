`::file-tree` renders only its fenced block, so anything else inside it, such as a sentence about the tree or a second fenced block, doesn't render. Write it before or after the block.

::incorrect
````md
::file-tree
The pond service after the move:

```
pond/
  ducks.ts
  pigeons.ts
```
::
````
::

::correct
````md
The pond service after the move:

::file-tree
```
pond/
  ducks.ts
  pigeons.ts
```
::
````
::
