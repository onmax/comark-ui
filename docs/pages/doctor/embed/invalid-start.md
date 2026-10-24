`start` is where a YouTube or Vimeo video begins, in whole seconds. Anything else, such as `1:30` or `90s`, is ignored and the video starts at the beginning.

::incorrect
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds" start="1:30"}
::
```
::

::correct
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds" start=90}
::
```
::
