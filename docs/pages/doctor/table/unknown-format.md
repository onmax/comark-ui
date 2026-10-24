A table reads CSV, TSV, and JSON. It takes the format from `format`, else the file's extension or the fence's language, and anything else renders nothing. Set `format` when a file is named otherwise.

::incorrect
````md
::table
```yaml
- pond: Mill pond
  ducks: 14
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
