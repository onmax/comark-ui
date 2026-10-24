There's no file at the path `src` resolves to, so the include is dropped. A relative `src` starts in the folder of the file that includes it, which for the document is the `base` option, and one that starts with `/` starts at the `root`. The message gives the path it looked for.

::incorrect
```md
:include{src="duck.md"}
```
::

::correct
```md
:include{src="ducks.md"}
```
::
