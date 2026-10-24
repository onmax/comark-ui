No file sits at `src` under the plugin's `root`, so the cast renders nothing. The message gives the path it looked for, which shows whether `src` or `root` is wrong.

::incorrect
```md
::cast{src="deploy-pigeons.cast"}
::
```
::

::correct
```md
::cast{src="deploy.cast"}
::
```
::
