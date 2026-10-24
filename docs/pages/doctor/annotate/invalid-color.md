Each named color means one thing: `violet`, the default, points something out, `red` flags a problem, `amber` a warning, `green` a fix, `blue` is a second voice, and `gray` anything neutral. Any other color has to be a 3- or 6-digit hex color like `#e5484d`. Anything else is dropped, and the mark takes the default color.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 color="orange"}
The duck without a name tag.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=20 y=30 w=15 h=10 color="amber"}
The duck without a name tag.
:::
::
```
::
