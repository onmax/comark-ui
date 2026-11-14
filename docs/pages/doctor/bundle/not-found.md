`before`, `after`, and `src` are read from the document's folder, or from the root when they start with `/`. When nothing is there, the block renders nothing. The message gives the path it tried, which usually shows a typo or a build that hasn't run yet.

::incorrect
```md
::bundle{before="builds/main/assets" after="builds/branch/assets"}
::
```
::

::correct
```md
::bundle{before="builds/main/assets" after="builds/pr/assets"}
::
```
::
