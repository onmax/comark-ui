`mode` is an option of the plugin, not of the Markdown: `view` shows every change, `accept` renders the document with the changes made, and `reject` without them. Any other value, such as `merge`, falls back to `view`, so a page meant to show the accepted text still shows every insertion and deletion.

::incorrect
```ts
import critic from "comark-critic";

const plugins = [critic({ mode: "merge" })];
```
::

::correct
```ts
import critic from "comark-critic";

const plugins = [critic({ mode: "accept" })];
```
::
