A link card is covered by one link, so a `javascript:`, `vbscript:`, or `data:` URL in `to` would run on a click anywhere on the card. comark-cards drops the link and renders a plain card, but another renderer, such as Nuxt UI's, may not.

::incorrect
```md
::card{title="Pond report" to="javascript:alert('quack')"}
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
