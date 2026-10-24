`startLineNumber` sets the number of a block's first line, so an excerpt can keep the numbers it has in its file. Anything but a whole number, such as `L120` or `120.5`, is ignored, and the lines are numbered from 1.

::incorrect
````md
```js startLineNumber=L120
feedDucks(pond);
```
````
::

::correct
````md
```js startLineNumber=120
feedDucks(pond);
```
````
::
