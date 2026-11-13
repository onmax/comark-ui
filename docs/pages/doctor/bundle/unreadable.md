Each prop names a build's output folder, such as `dist/assets`. A file, a folder with no JavaScript, or a build whose entry chunk the block can't find renders nothing. Point the prop at the folder of chunks, and keep the `index.html` or `.vite/manifest.json` Vite writes next to it when the message asks for it.

::incorrect
```md
::bundle{src="builds/main/assets/index-a1.js"}
::
```
::

::correct
```md
::bundle{src="builds/pr/assets"}
::
```
::
