A `:chip` links to its `href`, and that has to be a full web address. Without `https://`, the browser reads it as a path on your own site, so the chip links to a page that isn't there and shows no image.

::incorrect
```md
The census is in the :chip[pond log]{href="pond.example/log"}.
```
::

::correct
```md
The census is in the :chip[pond log]{href="https://pond.example/log"}.
```
::
