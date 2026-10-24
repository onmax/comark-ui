A gantt draws each row as a bar from where it starts to where it ends, so its table needs two columns of numbers or of dates, and every row needs both. A row with only one isn't drawn. A milestone, a moment rather than a span, ends where it starts.

::incorrect
```md
::chart{type="gantt" title="Pond cleanup (days)"}
| task | days |
| --- | --: |
| drain the pond | 2 |
| fish out the shopping carts | 3 |
| refill | 1 |
::
```
::

::correct
```md
::chart{type="gantt" title="Pond cleanup (days)"}
| task | start | end |
| --- | --: | --: |
| drain the pond | 0 | 2 |
| fish out the shopping carts | 2 | 5 |
| refill | 5 | 6 |
| ducks return | 6 | 6 |
::
```
::
