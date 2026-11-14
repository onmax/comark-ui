`::bundle` reads only under the root it was given, so a path that climbs out of it renders nothing. Move the build under the root, or widen `root` in the plugin's options.

::incorrect
```md
::bundle{before="../../main/assets" after="builds/pr/assets"}
::
```
::

::correct
```md
::bundle{before="builds/main/assets" after="builds/pr/assets"}
::
```
::
