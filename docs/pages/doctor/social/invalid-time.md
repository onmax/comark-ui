`time` is when the post was published, as an ISO date (`2026-11-28`) or an instant (`2026-11-28T09:30:00Z`). The card shows it as a short date with the full date in its tooltip. Words such as "yesterday" are shown as written, since they'd be wrong a day later.

::incorrect
```md
::post{platform="x" author="Ada" time="yesterday"}
Shipped it.
::
```
::

::correct
```md
::post{platform="x" author="Ada" time="2026-11-27"}
Shipped it.
::
```
::
