A diff shows one file, under the name of the first block. When the second block names another file, the change shown is between two different files. Put each file in its own diff.

::incorrect
````md
::diff
```ts [src/ducks.ts]
const meals = 1
```
```ts [src/geese.ts]
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
```ts [src/ducks.ts]
const meals = 2
```
::
````
::
