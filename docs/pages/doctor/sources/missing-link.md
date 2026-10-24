Each item in `::sources` is a source a reader can open. An item with no link still gets a number and takes citations, but a reader who follows one finds a title and nowhere to go.

::incorrect
```md
::sources
1. The pond survey from last spring
::
```
::

::correct
```md
::sources
1. [The pond survey from last spring](https://example.com/pond-survey)
::
```
::
