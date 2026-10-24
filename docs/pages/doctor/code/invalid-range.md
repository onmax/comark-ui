`ins`, `del`, `mark`, and `collapse` take line numbers in braces, as Expressive Code writes them: a line such as `{3}`, a range such as `{2-4}`, or a list of both, `{2-4,7}`. Anything else, such as `mark=3` or a range that runs backwards, marks no line.

::incorrect
````md
```js mark=2
const ducks = 14;
const pigeons = 3;
```
````
::

::correct
````md
```js mark={2}
const ducks = 14;
const pigeons = 3;
```
````
::
