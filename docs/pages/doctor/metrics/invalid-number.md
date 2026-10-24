`from`, `to`, and `value` must be numbers, optionally followed by a unit, such as `412` or `412 kB`. A word, such as `from="four"` or `value="most"`, can't be read, so the block renders empty. Write a progress bar as a fraction or as a count with `max`.

::incorrect
```md
Deploy time :delta{from="four" to=3 unit="min" better="lower"}
```
::

::correct
```md
Deploy time :delta{from=4 to=3 unit="min" better="lower"}
```
::
