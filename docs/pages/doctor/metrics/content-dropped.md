`::stats` renders only its table, so any other text inside the block is dropped. Write it before or after the block.

::incorrect
```md
::stats
The pond deploy got faster.

| Metric | Before | After |
| --- | --- | --- |
| Deploy time | 4.2 min | 3.1 min |
::
```
::

::correct
```md
The pond deploy got faster.

::stats
| Metric | Before | After |
| --- | --- | --- |
| Deploy time | 4.2 min | 3.1 min |
::
```
::
