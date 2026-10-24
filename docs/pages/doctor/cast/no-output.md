Only output events, the ones with `"o"`, draw on the terminal. A cast with a header and nothing else, or with only input and markers, has nothing to show, which usually means the recording stopped before the command ran.

::incorrect
````md
::cast
```json
{"version": 2, "width": 40, "height": 3}
[0.1, "i", "pnpm deploy\r"]
```
::
````
::

::correct
````md
::cast
```json
{"version": 2, "width": 40, "height": 3}
[0.1, "o", "$ pnpm deploy\r\n"]
```
::
````
::
