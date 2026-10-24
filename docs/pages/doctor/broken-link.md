A link or image whose file doesn't exist, from `href` and `src` alike, so a screenshot whose `src` is missing counts. A link resolves the way a site serves it: `./setup` and `./setup/` find `setup.md` or `setup/index.md`. When a near name exists, the fix names it.

A relative link resolves from the document, and one that starts with `/` from the project root, as on GitHub. If your site serves `/guide/` from another folder, map it in [`links.routes`](/lint/getting-started/#links). The rule needs the document's path, so the command line and Vite Doctor check it, and `lint()` checks it when you pass `file`. These examples sit next to a `ducks.md`.

::incorrect
```md
The north pond has [a dozen ducks](./duck.md).
```
::

::correct
```md
The north pond has [a dozen ducks](./ducks.md).
```
::
