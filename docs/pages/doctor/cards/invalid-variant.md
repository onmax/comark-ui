A card's `variant` takes one of Nuxt UI's card variants: `outline`, the default, keeps the card plain, `soft` washes it in its `color`, and `subtle` washes it and draws its border in the color too. Any other value, such as `solid` or `ghost`, shows as outline, so a card meant to stand out for a failing or a passing state looks like every other card.

::incorrect
```md
::card{title="Pond report" color="error" variant="filled"}
2 ducks missing.
::
```
::

::correct
```md
::card{title="Pond report" color="error" variant="soft"}
2 ducks missing.
::
```
::
