A card floats into the margin from its anchor's paragraph or list item. A heading or a table cell can't reach the margin, so a comment or suggestion there has no card. Comment on the heading from the paragraph under it.

::incorrect
```md
## Sign :suggestion[in]{from="on" note="The button says Sign in."}

Enter your email.
```
::

::correct
```md
## Sign in

:comment[Enter your email.]{note="The heading changed from Sign on, to match the button."}
```
::
