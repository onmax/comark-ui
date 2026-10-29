A comment's or a reply's `note` is what its card says. Without it, a comment's card is empty, and a reply renders nothing.

::incorrect
```md
The link expires after :comment[15 minutes]{by="@onmax"}.
```
::

::correct
```md
The link expires after :comment[15 minutes]{by="@onmax" note="Is 15 minutes enough?"}.
```
::
