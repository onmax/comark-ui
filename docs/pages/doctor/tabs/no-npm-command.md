An `npm2yarn` block turns npm and npx commands into each package manager's. A block written in another manager, such as `pnpm add`, has nothing to turn, so every tab shows the same command and the pnpm one ends up under npm's label.

::incorrect
````md
```sh npm2yarn
pnpm add duck-feeder
```
````
::

::correct
````md
```sh npm2yarn
npm install duck-feeder
```
````
::
