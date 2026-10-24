When the two blocks are the same, the diff draws every line as unchanged and suggests nothing. This usually means the edit went into the wrong block or wasn't made.

::incorrect
````md
::diff
```ts [src/ducks.ts]
const meals = 1
```
```ts
const meals = 1
```
::
````
::

::correct
````md
::diff
```ts [src/ducks.ts]
const meals = 1
```
```ts
const meals = 2
```
::
````
::
