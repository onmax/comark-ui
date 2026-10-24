`description` is the text a field shows when it has no written paragraph of its own. A field with a paragraph shows that instead, so write the description in one place.

::incorrect
```md
::field{name="flock" description="How the pigeons fly."}
The pigeons fly in a flock.
::
```
::

::correct
```md
::field{name="flock"}
The pigeons fly in a flock.
::
```
::
