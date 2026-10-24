A progress bar's `value` runs from 0 to `max`, which is 1 unless you set it. A value outside that range is clamped, so the bar shows full or empty and the percent is wrong. The usual cause is a percent written without `max=100`.

::incorrect
```md
Deploys migrated :progress{value=85}
```
::

::correct
```md
Deploys migrated :progress{value=85 max=100}
```
::
