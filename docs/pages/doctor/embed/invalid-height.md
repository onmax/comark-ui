`height` is how tall a tool player is, in whole pixels. Anything else, such as `30rem` or `50%`, is ignored and the player keeps its default height.

::incorrect
```md
::embed{url="https://codepen.io/onmax/pen/abcdEF" title="The duck pond counter" height="30rem"}
::
```
::

::correct
```md
::embed{url="https://codepen.io/onmax/pen/abcdEF" title="The duck pond counter" height=480}
::
```
::
