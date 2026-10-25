A `pm` block turns each package manager command into every other manager's. A block with no command, such as one that only runs `ls`, has nothing to turn, so every tab shows the same code.

::incorrect
````md
```sh pm
ls duck-feeder
```
````
::

::correct
````md
```sh pm
pnpm add duck-feeder
```
````
::
