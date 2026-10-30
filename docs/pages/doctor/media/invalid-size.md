`width` and `height` are a video's size in pixels, so the page keeps its room before the video loads. They only give the room together, so one without the other, or one that isn't a whole number of pixels, is dropped. Supply both sides. `media({ size: true })` can read remote dimensions for trusted documents. A player is never wider than the page, whatever its `width`.

::incorrect
```md
![A tour of the duck pond](/pond-tour.mp4){width="640"}
```
::

::correct
```md
![A tour of the duck pond](/pond-tour.mp4){width=1280 height=720}
```
::
