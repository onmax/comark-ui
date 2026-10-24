A `::stats` table has three columns: a name, the value before, and the value after. With `tiles`, it can also have two: a name and a value. A table with more or fewer columns is shown as written, without a change column or tiles, and a row with more or fewer cells has no change. Move other columns to a table of their own, or write `::stats{tiles}` for a table of names and values.

::incorrect
```md
::stats
| Metric | Before | After | Owner |
| --- | --- | --- | --- |
| Deploy time | 4.2 min | 3.1 min | Duck team |
::
```
::

::correct
```md
::stats
| Metric | Before | After |
| --- | --- | --- |
| Deploy time | 4.2 min | 3.1 min |
::
```
::
