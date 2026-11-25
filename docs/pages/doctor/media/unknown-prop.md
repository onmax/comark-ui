A video takes `autoplay`, `loop`, `muted`, `poster`, `width`, and `height`, audio the first three, and a PDF none. Any other option, such as `controls`, is dropped. Players always show their controls, and take the width of the page at most.

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
