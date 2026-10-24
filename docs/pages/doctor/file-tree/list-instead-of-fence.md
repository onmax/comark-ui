`::file-tree` reads its tree from a fenced block. A Markdown list inside it renders as a list, and a list loses names: `__init__.py` turns bold and `[id].vue` becomes a span.

::incorrect
```md
::file-tree
- ponds/
  - north.md
  - south.md
::
```
::

::correct
````md
::file-tree
```
ponds/
  north.md
  south.md
```
::
````
::
