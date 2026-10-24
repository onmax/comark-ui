A prop written with a `:` reads its value from the frontmatter or the document's meta. When nothing is at that path, the prop is empty: a box sits at 0, or a screenshot loses its image. Bindings to `data` or `props` are left alone, since the renderer fills those in.

::incorrect
```md
---
duck:
  x: 20
  y: 30
---

::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{:x="frontmatter.duck.x" :y="frontmatter.duck.why" w=15 h=10}
The duck without a name tag.
:::
::
```
::

::correct
```md
---
duck:
  x: 20
  y: 30
---

::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{:x="frontmatter.duck.x" :y="frontmatter.duck.y" w=15 h=10}
The duck without a name tag.
:::
::
```
::
