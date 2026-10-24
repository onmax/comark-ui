Each marker links to the note with its number, so `// <3>` needs a third item in the list after the fence. A marker past the end of the list links nowhere. It usually means a note was deleted, or a marker was renumbered and the list wasn't.

::incorrect
````md
```ts
const ducks = await pond.count() // <1>
await feed(ducks) // <2>
```

1. Count the ducks before feeding them.
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
