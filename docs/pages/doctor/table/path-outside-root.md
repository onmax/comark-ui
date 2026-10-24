A `src` can't climb out of the `root` folder, so a document can't print a file the site never meant to show, such as a key or a config. The table renders nothing. Move the file under the root, or set `root` to a folder that holds it.

::incorrect
```md
::table{src="../../secrets.csv"}
::
```
::

::correct
```md
::table{src="ducks.csv"}
::
```
::
