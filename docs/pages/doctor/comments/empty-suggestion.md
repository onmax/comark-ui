A `:suggestion` with nothing in its brackets and no `from` has nothing to add and nothing to remove, so it renders nothing. Put the new text in its brackets, the text it replaces in `from`, or both.

::incorrect
```md
To log in, :suggestion[]{note="Too wordy."} enter your email.
```
::

::correct
```md
To log in, :suggestion[]{from="simply" note="Too wordy."} enter your email.
```
::
