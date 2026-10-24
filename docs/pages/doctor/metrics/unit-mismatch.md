A row's change compares its before and after as written, so both must be in the same unit. A row in MB before and kB after would show a change that isn't true, so it shows none.

::incorrect
```md
::stats
| Metric | Before | After |
| --- | --- | --- |
| Pond photo | 1.2 MB | 800 kB |
::
```
::

::correct
```md
::stats
| Metric | Before | After |
| --- | --- | --- |
| Pond photo | 1200 kB | 800 kB |
::
```
::
