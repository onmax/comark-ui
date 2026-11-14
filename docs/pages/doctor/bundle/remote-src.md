`::bundle` reads builds from disk while it parses, never from a URL. Build both versions locally and point the props at their output folders.

::incorrect
```md
::bundle{before="https://example.com/main/assets" after="builds/pr/assets"}
::
```
::

::correct
```md
::bundle{before="builds/main/assets" after="builds/pr/assets"}
::
```
::
