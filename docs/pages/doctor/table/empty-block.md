A `::table` shows a file, a Markdown table, or one csv, tsv, or json fence. Anything else inside it, such as a paragraph, isn't data, so the block renders nothing.

::incorrect
```md
::table
Mill pond, 14 ducks. Castle moat, 3 ducks.
::
```
::

::correct
````md
::table
```csv
pond,ducks
Mill pond,14
Castle moat,3
```
::
````
::
