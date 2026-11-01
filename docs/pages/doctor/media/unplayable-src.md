A `:media` block plays only files a browser can play on its own: `.mp4`, `.webm`, `.mov`, and `.m4v` video, and `.mp3`, `.wav`, `.ogg`, and `.m4a` audio. Any other file renders nothing. An image written as `![]()` is media only when its file is one of these, so a GIF stays an image.

::incorrect
```md
:media{src="/pond-tour.gif" alt="A tour of the duck pond"}
```
::

::correct
```md
:media{src="/pond-tour.mp4" alt="A tour of the duck pond" width=1280 height=720}
```
::
