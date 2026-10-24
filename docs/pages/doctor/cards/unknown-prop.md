`::card` reads `title`, `description`, `icon`, `to`, `target`, `color`, and `variant`, and `::columns` reads `cols`. Every other prop is ignored, so a card with `link` or `url` isn't a link, and `::columns{columns=3}` shows 2 columns.

::incorrect
```md
::card{title="Pond report" link="/ponds/"}
14 ducks, 3 pigeons.
::
```
::

::correct
```md
::card{title="Pond report" to="/ponds/"}
14 ducks, 3 pigeons.
::
```
::
