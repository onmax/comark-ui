The JSON of a file or a fence doesn't parse, so the table renders nothing. The message gives the parser's error. Trailing commas, single quotes, and keys without quotes are the usual causes.

::incorrect
````md
::table
```json
[{ "pond": "Mill pond", "ducks": 14, }]
```
::
````
::

::correct
````md
::table
```json
[{ "pond": "Mill pond", "ducks": 14 }]
```
::
````
::
