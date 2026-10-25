`:badge` reads `color` for prose, and the documented image props for SVG and live badges. It ignores other props. A `size` or `variant` copied from Nuxt UI's `UBadge` component changes nothing, since Nuxt UI's prose badge doesn't read them either.

::incorrect
```md
The pigeon count is :badge[beta]{color="warning" size="sm"}.
```
::

::correct
```md
The pigeon count is :badge[beta]{color="warning"}.
```
::
