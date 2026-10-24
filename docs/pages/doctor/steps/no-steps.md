`::steps` makes a step of each heading at `level`, `###` by default, or of each item of the one numbered list inside. A block with neither renders as plain content with no numbers. When its headings are at another level, the message names the `level` to write.

::incorrect
```md
::steps
- Fill the pond.
- Let the ducks in.
::
```
::

::correct
```md
::steps
1. Fill the pond.
2. Let the ducks in.
::
```
::
