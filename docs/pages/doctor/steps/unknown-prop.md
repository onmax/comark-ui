`::steps` reads only `level`, and ignores every other prop. A `start` doesn't change the first number: start a numbered list inside at that number instead, such as `3.`.

::incorrect
```md
::steps{start="3"}
### Fill the pond
Run the hose for an hour.

### Let the ducks in
Open the gate.
::
```
::

::correct
```md
::steps
3. Fill the pond.
4. Let the ducks in.
::
```
::
