`:suggestion` reads `from`, `by`, `note`, `mark`, and `#id`; `:comment` reads `by`, `note`, and `#id`; and a reply reads `reply`, `by`, and `note`. Any other prop is ignored, so a guessed one shows nothing: `reason="…"` leaves the suggestion with no card.

::incorrect
```md
To :suggestion[sign in]{from="log in" reason="The button says Sign in."}, enter your email.
```
::

::correct
```md
To :suggestion[sign in]{from="log in" note="The button says Sign in."}, enter your email.
```
::
