`::bundle` reads builds from disk while it parses, never from a URL. Download the report next to the document, or build both versions locally, and point the props at those paths.

::incorrect
```md
::bundle{before="https://example.com/main.json" after="reports/pr.json"}
::
```
::

::correct
```md
::bundle{before="reports/main.json" after="reports/pr.json"}
::
```
::
