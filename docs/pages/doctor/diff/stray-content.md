A `::diff` draws its two code blocks and nothing else, so text inside it is dropped. Write the explanation above or below the diff.

::incorrect
````md
::diff
Feed the ducks twice a day.

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
Feed the ducks twice a day.

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
