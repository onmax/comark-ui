A `{` that opens attributes after a component, a `[span]`, a link, or an image, and is never closed. Comark reads the rest of the line as attributes. It also reports a key set twice in one `{…}`, since Comark keeps only the last.

::incorrect
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"
::
```
::

::correct
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::
