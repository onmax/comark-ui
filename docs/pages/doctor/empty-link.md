A link with nothing between its brackets renders as an empty `<a>`: readers can't see or click it, and screen readers read out its URL.

::incorrect
```md
The census is [](/census/).
```
::

::correct
```md
The [census](/census/) is out.
```
::
