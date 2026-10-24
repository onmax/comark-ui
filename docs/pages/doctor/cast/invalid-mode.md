`mode` is `screen`, the terminal's last screen, or `log`, every line the program printed. Any other value shows the screen. There's no player mode: a cast always renders as text.

::incorrect
```md
::cast{src="deploy.cast" mode="player"}
::
```
::

::correct
```md
::cast{src="deploy.cast" mode="log"}
::
```
::
