Each note in the list links back to its marker in the code. A note whose number no line carries explains nothing in particular, and readers can't tell which line it means. Add the marker at the end of its line, in the language's comment, or remove the note.

::incorrect
````md
```ts
const ducks = await pond.count() // <1>
await feed(ducks)
```

1. Count the ducks before feeding them.
2. Feed them once a day, before the deploy.
````
::

::correct
````md
```ts
const ducks = await pond.count() // <1>
await feed(ducks) // <2>
```

1. Count the ducks before feeding them.
2. Feed them once a day, before the deploy.
````
::
