`line` is the file's line number for the first line of both blocks, and numbers the rest from there. Anything but a whole number from 1, such as a range, is ignored, and the diff shows no line numbers.

::incorrect
````md
::diff{line="12-14"}
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
::diff{line=12}
```ts [src/ducks.ts]
const meals = 1
```
```ts
const meals = 2
```
::
````
::
