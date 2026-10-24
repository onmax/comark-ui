Both blocks are the same file, so they're highlighted as one language. When the languages differ, one side is highlighted wrong, and a block without a language isn't highlighted at all.

::incorrect
````md
::diff
```ts [src/ducks.ts]
const meals = 1
```
```js
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
