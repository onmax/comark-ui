A table reads JSON as an array of objects, one per row, with a column for every key. A single object, or an array of arrays or numbers, has no rows to read, so the table renders nothing.

::incorrect
````md
::table
```json
{ "Mill pond": 14, "Castle moat": 3 }
```
::
````
::

::correct
````md
::table
```json
[{ "pond": "Mill pond", "ducks": 14 }, { "pond": "Castle moat", "ducks": 3 }]
```
::
````
::
