A diff is read by the file it changes, the way a review names a suggestion. Name it on the first block, like `` ```ts [src/ducks.ts] ``, or with `file`.

::incorrect
````md
::diff
```ts
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
