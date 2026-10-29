Comments and suggestions share one id space, and a `reply` finds its thread by id. When two threads share an id, replies go to the first one, and only the first keeps the id.

::incorrect
```md
The link expires after :comment[15 minutes]{#ttl note="Is 15 minutes enough?"}, and a code after :comment[10 minutes]{#ttl note="Should the code last as long?"}.

:comment{reply="ttl" note="Keeping 15."}
```
::

::correct
```md
The link expires after :comment[15 minutes]{#ttl note="Is 15 minutes enough?"}, and a code after :comment[10 minutes]{#code note="Should the code last as long?"}.

:comment{reply="ttl" note="Keeping 15."}
```
::
