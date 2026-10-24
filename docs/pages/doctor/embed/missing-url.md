`::embed` reads its player or card from `url` alone, so a block without one renders nothing.

::incorrect
```md
::embed{title="Vite in 100 Seconds"}
::
```
::

::correct
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::
