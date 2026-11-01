A video's file says its size only once it starts loading. Until then the page holds a 16:9 box for it, and when the video is another shape, the text below it moves. Write the video's `width` and `height` in pixels, so the page keeps its room from the start. `media({ size: true })` reads them from remote files for trusted documents, and a data URI is measured without it. A GitHub attachment link takes no props, so it isn't reported.

::incorrect
```md
![A tour of the duck pond](/pond-tour.mp4)
```
::

::correct
```md
![A tour of the duck pond](/pond-tour.mp4){width=1280 height=720}
```
::
