A `threshold` is a number and a unit: `s`, `m`, `h`, `d`, `w`, `mo`, or `y`. Write `none` to keep a date relative at any distance. Anything else is ignored, and the date uses the default threshold.

::incorrect
```md
Opened :time[2026-09-30]{threshold="a month"}.
```
::

::correct
```md
Opened :time[2026-09-30]{threshold="6w"}.
```
::
