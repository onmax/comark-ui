Image badges need a value for static content, a package for npm, or a repository and workflow for GitHub Actions.

::incorrect
```md
:badge{source="npm-version"}
```
::

::correct
```md
:badge{source="npm-version" package="comark-ui"}
```
::
