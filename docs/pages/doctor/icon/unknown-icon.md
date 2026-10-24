The set exists but has no icon by that name, so the icon is left out of the page. The message links the set's page on [Icônes](https://icones.js.org), where you can search it for the name it uses.

The same rule covers the `icon` of a `:::tabs-item`, a code group's block, a `::card`, or a comark-code action.

::incorrect
```md
The pond opens at noon :icon{name="lucide:duck"}
```
::

::correct
```md
The pond opens at noon :icon{name="lucide:bird"}
```
::
