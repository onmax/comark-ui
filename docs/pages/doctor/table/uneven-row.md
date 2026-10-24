A row has more or fewer cells than the header has columns. The table still renders, with a missing cell left empty and an extra one dropped. The message names the first such row. A comma inside a cell is the usual cause: put that cell in double quotes.

::incorrect
````md
```csv
pond,ducks
Mill pond,14,2 herons
```
````
::

::correct
````md
```csv
pond,ducks
Mill pond,"14, and 2 herons"
```
````
::
