An `npm2yarn` block is written in npm and gets a tab for each package manager. Some npm commands, such as `npm ci` or `npm update`, have no form in another manager, so that manager's tab is left out and readers who use it see only npm's.

::incorrect
````md
```sh npm2yarn
npm ci
```
````
::

::correct
````md
::code-group{sync="pm"}
```sh [npm]
npm ci
```

```sh [pnpm]
pnpm install --frozen-lockfile
```
::
````
::
