`:time` reads one prop, `threshold`. Any other is ignored. The date goes in the brackets, not in a prop.

::incorrect
```md
Opened :time[2026-11-02]{format="long"}.
```
::

::correct
```md
Opened :time[2026-11-02]{threshold="2w"}.
```
::
