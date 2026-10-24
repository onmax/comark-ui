A `::diff` works out the changed lines and words itself, from the file before and after. A unified diff with `+` and `-` lines in one block shows up as a deleted file, every line removed with its markers and without the file's highlighting. Write the old lines in one block and the new lines in another, in the file's language.

::incorrect
````md
::diff{file="src/ducks.ts"}
```diff
-const meals = 1
+const meals = 2
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
