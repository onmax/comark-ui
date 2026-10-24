After the header, every line of a cast is a JSON event: the time, a code such as `"o"` for output, and its text. A line that isn't one, such as a stray note or a trailing comma, stops the replay, and the cast renders nothing. The message gives the line's number. A comment starts with `#`.

::incorrect
````md
::cast
```json
{"version": 2, "width": 40, "height": 3}
[0.1, "o", "$ pnpm deploy\r\n"]
The ducks are fed
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
[0.4, "o", "The ducks are fed\r\n"]
```
::
````
::
