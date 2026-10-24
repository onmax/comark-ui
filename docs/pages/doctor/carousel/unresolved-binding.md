Each slide takes the carousel's `zoom` and `title` while the document is parsed. A `:zoom` or `:title` bound to a frontmatter key that doesn't exist, or to `data` and `props` that only arrive when it renders, gives the slides nothing, so the carousel has no title and keeps its zoom.

::incorrect
```md
---
pond: North pond
---

::carousel{:title="frontmatter.pound"}
Two ducks nest by the reeds.

The pigeons left at noon.
::
```
::

::correct
```md
---
pond: North pond
---

::carousel{:title="frontmatter.pond"}
Two ducks nest by the reeds.

The pigeons left at noon.
::
```
::
