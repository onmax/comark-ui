`:delta` reads `from`, `to`, `unit`, and `better`, `:progress` reads `value`, `max`, and `label`, and `::stats` reads `unit`, `better`, and `tiles`. Every other prop is ignored, so a misspelled `better` leaves the change in a neutral color.

::incorrect
```md
Deploy time :delta{from=4.2 to=3.1 unit="min" beter="lower"}
```
::

::correct
```md
Deploy time :delta{from=4.2 to=3.1 unit="min" better="lower"}
```
::
