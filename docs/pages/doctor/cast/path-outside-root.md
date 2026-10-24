A cast can't be read from outside the plugin's `root`, so a `src` that climbs out with `../`, or a symlink that leads out, renders nothing. Otherwise a document could print any file the build can read, such as a key in the home folder, into the page.

::incorrect
```md
::cast{src="../../.ssh/id_ed25519"}
::
```
::

::correct
```md
::cast{src="deploy.cast"}
::
```
::
