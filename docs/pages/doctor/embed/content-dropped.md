`::embed` renders only its player or card, so anything written inside the block is dropped. This usually means the closing `::` is missing or in the wrong place.

::incorrect
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
Watch this before standup.
::
```
::

::correct
```md
Watch this before standup.

::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::
