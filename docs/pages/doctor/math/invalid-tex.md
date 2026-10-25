A formula between `$` signs, `\(…\)`, `$$`, `\[…\]`, or in a `math` fence is typeset while parsing. When its TeX doesn't parse, such as a `\frac` with one argument, a `\begin` with no `\end`, or a command the typesetter doesn't know, the page shows the TeX in a monospace font instead. Fix the TeX, or put it in code when it isn't math.

::incorrect
```md
The ducks share the bread as $\frac{b}$ each.
```
::

::correct
```md
The ducks share the bread as $\frac{b}{d}$ each.
```
::
