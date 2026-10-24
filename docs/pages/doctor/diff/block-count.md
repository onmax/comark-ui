A `::diff` reads its first code block as the file before the change and its second as the file after. With one block there's nothing to compare; leave the other empty for a file that's added or deleted. A third block is dropped.

::incorrect
````md
::diff
```ts [src/ducks.ts]
const meals = 2
```
::
````
::

::correct
````md
::diff
```ts [src/ducks.ts]
```
```ts
const meals = 2
```
::
````
::
