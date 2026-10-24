`::toc` reads `depth` and `title`, and ignores every other prop. A misspelled `depth`, or `levels` from another tool's table of contents, leaves the list at its default of h2 and h3.

::incorrect
```md
::toc{levels=4}
::

## Deploys

#### Rollbacks
```
::

::correct
```md
::toc{depth=4}
::

## Deploys

#### Rollbacks
```
::
