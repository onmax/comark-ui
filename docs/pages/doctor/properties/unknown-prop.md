`::properties` reads no props, so one written on the block is ignored. The keys it shows, and their order, come from the plugin's `keys` option, the same for every document.

::incorrect
```md
---
status: Ready for review
author: onmax
---

::properties{keys="status"}
::
```
::

::correct
```md
---
status: Ready for review
author: onmax
---

::properties
::
```
::
