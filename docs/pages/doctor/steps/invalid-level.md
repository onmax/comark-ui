`level` is the level of the headings that start each step, from 2 for `##` to 6 for `######`. Any other value, such as `h3` or `1`, falls back to 3, so the steps split at `###` headings, which may not be the ones the block has.

::incorrect
```md
::steps{level="h3"}
### Fill the pond
Run the hose for an hour.

### Let the ducks in
Open the gate.
::
```
::

::correct
```md
::steps{level="3"}
### Fill the pond
Run the hose for an hour.

### Let the ducks in
Open the gate.
::
```
::
