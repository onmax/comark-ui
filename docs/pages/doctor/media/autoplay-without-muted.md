Browsers start a video or audio file by itself only when it's muted, so `autoplay` without `muted` waits for a click like any other player.

::incorrect
```md
![The build spinner](/spinner.mp4){autoplay loop}
```
::

::correct
```md
![The build spinner](/spinner.mp4){autoplay loop muted}
```
::
