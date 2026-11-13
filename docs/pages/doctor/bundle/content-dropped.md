A `::bundle` reads its builds from its props, so anything written inside the block is dropped. Write the text before or after the block.

::incorrect
```md
::bundle{before="builds/main/assets" after="builds/pr/assets"}
ECharts now loads on every page.
::
```
::

::correct
```md
ECharts now loads on every page.

::bundle{before="builds/main/assets" after="builds/pr/assets"}
::
```
::
