`::bundle` reads only under the root it was given, so a path that climbs out of it renders nothing. Move the build under the root, or widen `root` in the plugin's options.

::incorrect
```md
::bundle{before="../../main.json" after="reports/pr.json"}
::
```
::

::correct
```md
::bundle{before="reports/main.json" after="reports/pr.json"}
::
```
::
