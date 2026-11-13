`before` and `after` come as a pair: the block compares one build with the other. With only one of them, it renders nothing. Add the missing build, or use `src` to show one build without a comparison.

::incorrect
```md
::bundle{after="reports/pr.json"}
::
```
::

::correct
```md
::bundle{src="reports/pr.json"}
::
```
::
