`poster` is the picture a video shows before it plays. An audio player has no picture to show, so a `poster` on audio is dropped.

::incorrect
```md
![The pigeons on the roof at dawn](/roof.mp3){poster="/roof.png"}
```
::

::correct
```md
![The pigeons on the roof at dawn](/roof.mp3)
```
::
