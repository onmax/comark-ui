Nuxt UI links a card with `to` and ignores `href`, so a card written with `href` isn't a link under Nuxt UI. comark-cards links it anyway, so the page looks right here and breaks there.

::incorrect
```md
::card{title="Pond report" href="/ponds/"}
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
