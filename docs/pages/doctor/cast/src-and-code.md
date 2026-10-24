A `::cast` reads its recording from `src` or from a code block inside it. With both, it shows the file and drops the code block, so whichever you edited last may not be the one readers see.

::incorrect
````md
::cast{src="deploy.cast"}
```json
{"version": 2, "width": 40, "height": 3}
[0.1, "o", "$ pnpm deploy\r\n"]
```
::
````
::

::correct
```md
::cast{src="deploy.cast"}
::
```
::
