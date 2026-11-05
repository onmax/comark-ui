`:time` reads an ISO date, such as `2026-10-12`, or an ISO date and time, such as `2026-10-12T14:03:00Z`. Other text, a month that doesn't exist, or a time past 23:59 isn't a date, so the text is shown as written, with no tooltip. Write the date in ISO form.

::incorrect
```md
Opened :time[next friday] and merged :time[2026-02-31].
```
::

::correct
```md
Opened :time[2026-11-02] and merged :time[2026-11-04T09:30:00Z].
```
::
