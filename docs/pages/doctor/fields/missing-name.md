A field's `name` is the prop, option, or parameter it describes, shown in code at the top of the field. A field with no `name` shows its type and description with nothing to say what they belong to.

::incorrect
```md
::field{type="number" default="3"}
How many ducks to feed before the deploy.
::
```
::

::correct
```md
::field{name="ducks" type="number" default="3"}
How many ducks to feed before the deploy.
::
```
::
