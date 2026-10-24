`::field` reads `name`, `type`, `required`, `default`, and `description`, and ignores every other prop. A misspelled `type` or `default` drops it from the field without a trace, so readers miss what the option takes.

::incorrect
```md
::field{name="pond" typ="string"}
The pond the pigeons fly to.
::
```
::

::correct
```md
::field{name="pond" type="string"}
The pond the pigeons fly to.
::
```
::
