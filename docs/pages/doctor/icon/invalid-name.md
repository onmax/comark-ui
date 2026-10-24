An icon name is its set and its name with a colon between, such as `lucide:bird`, or Nuxt UI's `i-lucide-bird`. A value that's neither, nor an image URL, can't be looked up, so the icon is left out of the page.

The same rule covers the `icon` of a `:::tabs-item`, a code group's block, or a `::card`.

::incorrect
```md
The pond opens at noon :icon{name="lucide bird"}
```
::

::correct
```md
The pond opens at noon :icon{name="lucide:bird"}
```
::
