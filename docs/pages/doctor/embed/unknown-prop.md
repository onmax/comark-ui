`::embed` reads `url`, `title`, and `start`, and ignores every other prop. A misspelled `title` leaves the player unnamed for screen readers.

::incorrect
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" titel="Vite in 100 Seconds"}
::
```
::

::correct
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::
