An asciinema cast starts with a JSON header that gives its version, 2 or 3, and the terminal's size. Without one the text isn't a cast, often because it's a plain log pasted into the block, and nothing renders. Record the session with `asciinema rec`, or write the header by hand.

::incorrect
````md
::cast
```
$ pnpm deploy
The pond is live
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
[0.4, "o", "The pond is live\r\n"]
```
::
````
::
