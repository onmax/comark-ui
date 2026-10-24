A user name or password before the host would show in the page's source and in every request the player makes, so the embed renders nothing.

::incorrect
```md
::embed{url="https://duck:quack@www.youtube.com/watch?v=KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::

::correct
```md
::embed{url="https://www.youtube.com/watch?v=KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::
