Each step starts at a heading, so anything before the first heading in `::steps` belongs to no step. It renders above the numbered steps, outside them.

::incorrect
```md
::steps
Do this before the ducks arrive.

### Fill the pond
Run the hose for an hour.

### Let the ducks in
Open the gate.
::
```
::

::correct
```md
Do this before the ducks arrive.

::steps
### Fill the pond
Run the hose for an hour.

### Let the ducks in
Open the gate.
::
```
::
