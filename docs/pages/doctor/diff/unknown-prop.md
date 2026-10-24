`::diff` reads `file`, `line`, and `label`, and ignores every other prop. A misspelled one is dropped without a word: here the heading never shows. The message suggests the prop you likely meant.

::incorrect
````md
::diff{title="Feed the ducks twice"}
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
::diff{label="Feed the ducks twice"}
```ts [src/ducks.ts]
const meals = 1
```
```ts
const meals = 2
```
::
````
::
