A reply answers a thread, so it points at no words of its own. Text in its brackets stays where the reply was written, as plain text, while the reply joins its thread. Write the reply with no brackets, and put what it says in `note`.

::incorrect
```md
The link expires after :comment[15 minutes]{#ttl note="Is 15 minutes enough?"}.

:comment[Keeping 15.]{reply="ttl" note="The email has a resend button."}
```
::

::correct
```md
The link expires after :comment[15 minutes]{#ttl note="Is 15 minutes enough?"}.

:comment{reply="ttl" note="Keeping 15. The email has a resend button."}
```
::
