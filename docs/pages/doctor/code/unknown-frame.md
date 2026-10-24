comark-code draws a block as a terminal, as a code editor, or with no frame. Any other `frame`, such as `window`, is left out, and the block falls back to the frame its language gives it.

::incorrect
````md
```sh frame="window"
pnpm run deploy
```
````
::

::correct
````md
```sh frame="terminal"
pnpm run deploy
```
````
::
