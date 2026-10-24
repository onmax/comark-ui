Frontmatter that isn't valid YAML, on the line of the YAML error. Comark throws on it and renders nothing; lint-comark reports it and still checks the rest of the document.

::incorrect
```md
---
title: Ducks: a census
---

# Ducks
```
::

::correct
```md
---
title: "Ducks: a census"
---

# Ducks
```
::
