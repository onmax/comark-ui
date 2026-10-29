A prop written with a `:` reads a value from the document's frontmatter or meta, or a JSON literal. If the path is undefined, the prop has no value. Fix the path or write the prop directly.

::incorrect
```md
---
old: log in
---
To :suggestion[sign in]{:from="frontmatter.original"}, enter your email.
```
::

::correct
```md
---
old: log in
---
To :suggestion[sign in]{:from="frontmatter.old"}, enter your email.
```
::
