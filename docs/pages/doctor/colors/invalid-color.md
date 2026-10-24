A palette draws hex, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, and `oklch()` colors. It doesn't read named colors such as `teal`, or `var()` and `color-mix()`, whose color depends on the page, so a line with one of those is left out.

::incorrect
```md
::palette
- Pond blue: #3b82f6
- Pigeon gray: slategray
::
```
::

::correct
```md
::palette
- Pond blue: #3b82f6
- Pigeon gray: #708090
::
```
::
