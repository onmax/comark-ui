`:qr` reads `value` and ignores every other prop. A link written as `url` or `href` isn't encoded, so the code doesn't render at all, and a prop such as `size` changes nothing.

::incorrect
```md
:qr{value="https://pond-preview.example.com" size="200"}
```
::

::correct
```md
:qr{value="https://pond-preview.example.com"}
```
::
