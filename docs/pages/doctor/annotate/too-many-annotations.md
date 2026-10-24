Hovering a mark highlights its note and the other way round, for the first 40 annotations of a screenshot or compare. Past that, marks and notes stop linking, and the image is too crowded to read anyway. Split it into several screenshots, each of one part of the page.

::incorrect
```md
::screenshot{src="/census.png" alt="The pigeon census board"}
:::annotation{x=4 y=4 w=6 h=6}
Pigeon 1.
:::
:::annotation{x=17 y=4 w=6 h=6}
Pigeon 2.
:::
:::annotation{x=30 y=4 w=6 h=6}
Pigeon 3.
:::
:::annotation{x=43 y=4 w=6 h=6}
Pigeon 4.
:::
:::annotation{x=56 y=4 w=6 h=6}
Pigeon 5.
:::
:::annotation{x=69 y=4 w=6 h=6}
Pigeon 6.
:::
:::annotation{x=82 y=4 w=6 h=6}
Pigeon 7.
:::
:::annotation{x=4 y=19 w=6 h=6}
Pigeon 8.
:::
:::annotation{x=17 y=19 w=6 h=6}
Pigeon 9.
:::
:::annotation{x=30 y=19 w=6 h=6}
Pigeon 10.
:::
:::annotation{x=43 y=19 w=6 h=6}
Pigeon 11.
:::
:::annotation{x=56 y=19 w=6 h=6}
Pigeon 12.
:::
:::annotation{x=69 y=19 w=6 h=6}
Pigeon 13.
:::
:::annotation{x=82 y=19 w=6 h=6}
Pigeon 14.
:::
:::annotation{x=4 y=34 w=6 h=6}
Pigeon 15.
:::
:::annotation{x=17 y=34 w=6 h=6}
Pigeon 16.
:::
:::annotation{x=30 y=34 w=6 h=6}
Pigeon 17.
:::
:::annotation{x=43 y=34 w=6 h=6}
Pigeon 18.
:::
:::annotation{x=56 y=34 w=6 h=6}
Pigeon 19.
:::
:::annotation{x=69 y=34 w=6 h=6}
Pigeon 20.
:::
:::annotation{x=82 y=34 w=6 h=6}
Pigeon 21.
:::
:::annotation{x=4 y=49 w=6 h=6}
Pigeon 22.
:::
:::annotation{x=17 y=49 w=6 h=6}
Pigeon 23.
:::
:::annotation{x=30 y=49 w=6 h=6}
Pigeon 24.
:::
:::annotation{x=43 y=49 w=6 h=6}
Pigeon 25.
:::
:::annotation{x=56 y=49 w=6 h=6}
Pigeon 26.
:::
:::annotation{x=69 y=49 w=6 h=6}
Pigeon 27.
:::
:::annotation{x=82 y=49 w=6 h=6}
Pigeon 28.
:::
:::annotation{x=4 y=64 w=6 h=6}
Pigeon 29.
:::
:::annotation{x=17 y=64 w=6 h=6}
Pigeon 30.
:::
:::annotation{x=30 y=64 w=6 h=6}
Pigeon 31.
:::
:::annotation{x=43 y=64 w=6 h=6}
Pigeon 32.
:::
:::annotation{x=56 y=64 w=6 h=6}
Pigeon 33.
:::
:::annotation{x=69 y=64 w=6 h=6}
Pigeon 34.
:::
:::annotation{x=82 y=64 w=6 h=6}
Pigeon 35.
:::
:::annotation{x=4 y=79 w=6 h=6}
Pigeon 36.
:::
:::annotation{x=17 y=79 w=6 h=6}
Pigeon 37.
:::
:::annotation{x=30 y=79 w=6 h=6}
Pigeon 38.
:::
:::annotation{x=43 y=79 w=6 h=6}
Pigeon 39.
:::
:::annotation{x=56 y=79 w=6 h=6}
Pigeon 40.
:::
:::annotation{x=69 y=79 w=6 h=6}
Pigeon 41.
:::
::
```
::

::correct
```md
::screenshot{src="/census-north.png" alt="The north half of the pigeon census board"}
:::annotation{x=10 y=20 w=30 h=30}
The north roof, with 21 pigeons.
:::
::

::screenshot{src="/census-south.png" alt="The south half of the pigeon census board"}
:::annotation{x=10 y=20 w=30 h=30}
The south roof, with 20 pigeons.
:::
::
```
::
