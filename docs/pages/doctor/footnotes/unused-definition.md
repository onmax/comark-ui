A definition is listed only when the text references it, so a `[^label]: …` line with no `[^label]` anywhere is dropped from the page. Add the reference where the note applies, or remove the definition.

::incorrect
```md
The pigeons left before the deploy.

[^pigeons]: They came back after lunch.
```
::

::correct
```md
The pigeons left before the deploy.[^pigeons]

[^pigeons]: They came back after lunch.
```
::
