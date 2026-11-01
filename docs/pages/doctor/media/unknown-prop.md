A video takes `autoplay`, `loop`, `muted`, `poster`, `width`, and `height`, and audio the first three. Any other option, such as `controls`, is dropped. Players always show their controls, and take the width of the page at most.

::incorrect
```md
![A tour of the duck pond](/pond-tour.mp4){controls="false" width=1280 height=720}
```
::

::correct
```md
![A tour of the duck pond](/pond-tour.mp4){width=1280 height=720}
```
::
