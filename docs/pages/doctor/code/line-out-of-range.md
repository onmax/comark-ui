A marked or collapsed range that runs past the block's last line usually means lines were cut from the code after the range was written. The lines past the end don't exist, so the range marks nothing.

::incorrect
````md
```js mark={3}
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
