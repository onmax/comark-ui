`::properties` shows the frontmatter keys the plugin is set to show, `status`, `pr`, `author`, `date`, and `tags` by default. When the frontmatter has none of them, the block renders an empty box.

::incorrect
```md
# The duck pond deploy

::properties
::
```
::

::correct
```md
---
author: onmax
---

# The duck pond deploy

::properties
::
```
::
