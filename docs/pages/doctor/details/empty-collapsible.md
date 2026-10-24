A `::collapsible` hides its content behind "Show properties". With nothing inside, opening it shows nothing.

::incorrect
```md
::collapsible{name="deploy options"}
::
```
::

::correct
```md
::collapsible{name="deploy options"}
- `region`: where the pigeons fly from.
- `retries`: how many times a deploy tries again.
::
```
::
