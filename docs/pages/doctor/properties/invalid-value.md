The box shows a key's value as text, a number, a link, or a list of those. An object, or a list inside a list, has no one way to show, so that key is left out of the box.

::incorrect
```md
---
status:
  state: ready
  since: 2026-10-23
---

# The duck pond deploy
```
::

::correct
```md
---
status: Ready since 2026-10-23
---

# The duck pond deploy
```
::
