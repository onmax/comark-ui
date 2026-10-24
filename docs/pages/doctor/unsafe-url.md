A `javascript:`, `vbscript:`, or `data:` URL in an `href` or `src` can run script when it's clicked or loaded. `data:` images are fine. Markdown's own `[text](url)` links drop these URLs already, so this catches the ones set as attributes.

::incorrect
```md
The pond has a :a[feed the ducks]{href="javascript:alert(1)"} button.
```
::

::correct
```md
The pond has a :a[feed the ducks]{href="/ducks/feed/"} button.
```
::
