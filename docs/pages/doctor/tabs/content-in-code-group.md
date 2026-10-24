Each code block in a `::code-group` becomes a tab, and anything else inside, such as a paragraph or a list, is dropped from the page. Write it before or after the group, or use `::tabs`, whose tabs hold any Markdown.

::incorrect
````md
::code-group
Run one of these before the deploy.

```sh [pnpm]
pnpm build
```

```sh [npm]
npm run build
```
::
````
::

::correct
````md
Run one of these before the deploy.

::code-group
```sh [pnpm]
pnpm build
```

```sh [npm]
npm run build
```
::
````
::
