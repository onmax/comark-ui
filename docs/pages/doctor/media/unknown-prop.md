A video takes `autoplay`, `loop`, `muted`, and `poster`, and audio the first three. Any other option, such as `controls` or `width`, is dropped. Players always show their controls, and take the width of the page.

::incorrect
```md
![A tour of the duck pond](/pond-tour.mp4){width="640"}
```
::

::correct
```md
![A tour of the duck pond](/pond-tour.mp4)
```
::
