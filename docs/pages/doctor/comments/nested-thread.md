A comment or suggestion inside another one has no card of its own: its card would sit inside the other's text. Write them one after the other, or reply to the outer one.

::incorrect
```md
To :suggestion[:comment[sign in]{note="Or log in?"}]{from="log in" note="The button says Sign in."}, enter your email.
```
::

::correct
```md
To :suggestion[sign in]{#sign-in from="log in" note="The button says Sign in."}, enter your email.

:comment{reply="sign-in" note="Or log in?"}
```
::
