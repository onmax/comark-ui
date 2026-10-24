`max` is the value of a full bar, so it must be a number above 0. A bar whose `max` is 0, negative, or not a number renders empty.

::incorrect
```md
Pigeons ringed :progress{value=17 max=0}
```
::

::correct
```md
Pigeons ringed :progress{value=17 max=20}
```
::
