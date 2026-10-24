`::stats` adds a change column to a Markdown table of names, befores, and afters. A block without a table has nothing to add it to, so it renders empty.

::incorrect
```md
::stats
Bundle size went from 412 kB to 388 kB.
::
```
::

::correct
```md
::stats
| Metric | Before | After |
| --- | --- | --- |
| Bundle size | 412 kB | 388 kB |
::
```
::
