A substitution, `{~~old~>new~~}`, needs `~>` between the text it removes and the text it adds. Without it the plugin can't tell them apart, so the mark stays in the page as written.

::incorrect
```md
The pond has {~~three ducks~~} today.
```
::

::correct
```md
The pond has {~~three~>four~~} ducks today.
```
::
