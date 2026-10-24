`::properties` renders only the box of frontmatter keys, so anything written inside the block is dropped. This usually means the closing `::` is missing or in the wrong place.

::incorrect
```md
---
status: Ready for review
---

# The duck pond deploy

::properties
The pigeons signed off on this one.
::
```
::

::correct
```md
---
status: Ready for review
---

# The duck pond deploy

::properties
::

The pigeons signed off on this one.
```
::
