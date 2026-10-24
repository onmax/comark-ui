`::toc` renders only its list of links, so anything written inside the block is dropped. This usually means the closing `::` is missing or in the wrong place.

::incorrect
```md
::toc
Where the ducks live.
::

## Ponds

## Feeding times
```
::

::correct
```md
Where the ducks live.

::toc
::

## Ponds

## Feeding times
```
::
