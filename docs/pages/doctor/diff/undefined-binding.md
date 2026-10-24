A prop written with a `:` reads its value from the frontmatter or the document's meta. When nothing is at that path, the prop is empty, so the diff loses its line numbers or its file name. Bindings to `data` or `props` are left alone, since the renderer fills those in.

::incorrect
````md
---
start: 12
---

::diff{:line="frontmatter.line"}
```ts [src/ducks.ts]
const meals = 1
```
```ts
const meals = 2
```
::
````
::

::correct
````md
---
start: 12
---

::diff{:line="frontmatter.start"}
```ts [src/ducks.ts]
const meals = 1
```
```ts
const meals = 2
```
::
````
::
