Comark drops a bound `src` or `href` that resolves to a script URL, such as `javascript:`, so the screenshot loses its image or its link. Bind it to an http:// or https:// URL, or for `src` a path to the image.

::incorrect
```md
---
pond: "javascript:alert('quack')"
---

::screenshot{src="/pond.png" alt="The pond map with three ducks" :href="frontmatter.pond"}
::
```
::

::correct
```md
---
pond: "https://pond.example.com/map"
---

::screenshot{src="/pond.png" alt="The pond map with three ducks" :href="frontmatter.pond"}
::
```
::
