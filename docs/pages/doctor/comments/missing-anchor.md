A `:comment` points at the words in its brackets. With nothing in them it has nothing to point at, so it renders nothing. Put the words it's about in its brackets, or answer a thread with `reply`.

::incorrect
```md
The link expires after 15 minutes :comment{note="Is 15 minutes enough?"}.
```
::

::correct
```md
The link expires after :comment[15 minutes]{note="Is 15 minutes enough?"}.
```
::
