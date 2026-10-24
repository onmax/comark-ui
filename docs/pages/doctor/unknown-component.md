A block or inline component that isn't one of your components or an HTML element, with the closest known name when one is near. Comark renders an unknown component as an empty element, so a typo makes the block vanish.

The rule needs the components you render with. Without them, any name could be valid, so [`lint()`](/lint/getting-started/#library) turns it off; the command line and Vite Doctor pass every installed package's.

::incorrect
```md
::embedd{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::

::correct
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Vite in 100 Seconds"}
::
```
::
