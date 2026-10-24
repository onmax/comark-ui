`better` says which way is good news, so the change is colored as better or worse. It takes `lower`, for sizes and durations, or `higher`, for scores and counts. Any other word is ignored and the change shows in a neutral color.

::incorrect
```md
Pond cleanup time :delta{from=40 to=32 unit="min" better="less"}
```
::

::correct
```md
Pond cleanup time :delta{from=40 to=32 unit="min" better="lower"}
```
::
