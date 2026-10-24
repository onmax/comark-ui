`:qr` encodes its `value`, so without one there's nothing to draw and the code renders nothing. The link usually ended up in the brackets, or under another name such as `url`.

::incorrect
```md
Scan :qr to open the pond preview on your phone.
```
::

::correct
```md
Scan :qr{value="https://pond-preview.example.com"} to open the pond preview on your phone.
```
::
