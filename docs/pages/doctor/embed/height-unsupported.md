Only a player with no height of its own, such as CodePen, StackBlitz, or Figma, takes `height`. A video keeps its aspect ratio, Spotify draws its own player, and an X post grows to the post, so `height` on them is ignored.

::incorrect
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds" height=480}
::
```
::

::correct
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::
