The first row of CSV and TSV is the header, so data with one row, or none, has nothing to put under it. A fence stays code and a `::table` renders nothing. JSON with an empty array has no rows either.

::incorrect
````md
```csv
pond,ducks
```
````
::

::correct
````md
```csv
pond,ducks
Mill pond,14
```
````
::
