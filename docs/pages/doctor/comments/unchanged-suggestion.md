A `:suggestion` whose `from` is the same as its new text changes nothing, so it renders as plain text and its note is lost. Change the new text, or remove the suggestion.

::incorrect
```md
To :suggestion[sign in]{from="sign in" note="The button says Sign in."}, enter your email.
```
::

::correct
```md
To :suggestion[sign in]{from="log in" note="The button says Sign in."}, enter your email.
```
::
