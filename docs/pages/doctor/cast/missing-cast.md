`::cast` shows a recording, from a file named in `src` or a code block inside it. A block with neither has nothing to replay and renders nothing.

::incorrect
```md
::cast{title="pnpm deploy"}
::
```
::

::correct
```md
::cast{src="deploy.cast" title="pnpm deploy"}
::
```
::
