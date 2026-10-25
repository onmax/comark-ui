A `pm` block can be written in any package manager and gets a tab for each one. Some commands have no form in another manager, such as a global install in yarn, or a command it doesn't read, such as `npm publish`, so that manager's tab is left out and readers who use it see only the others.

::incorrect
````md
```sh pm
npm install -g duck-feeder
```
````
::

::correct
````md
::code-group{sync="pm"}
```sh [npm]
npm install -g duck-feeder
```

```sh [pnpm]
pnpm add -g duck-feeder
```
::
````
::
