A marker like `// <1>` points at a note in the numbered list right after the fence. When no numbered list follows, the plugin can't tell markers from code, so it leaves them in the code as written and readers see `<1>` with nothing to point at.

A paragraph or a bulleted list between the fence and the notes has the same effect. Put the numbered list right after the closing fence.

::incorrect
````md
```ts
const ducks = await pond.count() // <1>
```

The count runs before each deploy.
````
::

::correct
````md
```ts
const ducks = await pond.count() // <1>
```

1. The count runs before each deploy.
````
::
