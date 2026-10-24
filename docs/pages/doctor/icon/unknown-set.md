The part before the colon names an icon set. When Iconify has no set by that name, and `collections` doesn't pass one, the icon is left out of the page. A typo in the set's name is the usual cause. [Icônes](https://icones.js.org) lists every set.

The same rule covers the `icon` of a `:::tabs-item`, a code group's block, a `::card`, or a comark-code action.

::incorrect
```md
The pond opens at noon :icon{name="lucid:bird"}
```
::

::correct
```md
The pond opens at noon :icon{name="lucide:bird"}
```
::
