In CSV, a cell that starts with `"` runs to the next `"`, commas and line breaks included. One that never closes swallows the rest of the data, so a fence stays code and a `::table` renders nothing. Write a quote inside a quoted cell as `""`.

::incorrect
````md
```csv
pond,note
Mill pond,"14 ducks, 2 herons
Castle moat,3 ducks
```
````
::

::correct
````md
```csv
pond,note
Mill pond,"14 ducks, 2 herons"
Castle moat,3 ducks
```
````
::
