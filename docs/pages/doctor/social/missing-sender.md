A `:::message` sits on the right when its `from` is the conversation's `me`, and on the left with that sender's name and avatar otherwise. A message with no `from` shows on the left with no name, so a reader can't tell who sent it. Write the sender in `from`.

::incorrect
```md
::conversation{me="Ada" platform="x"}
:::message
Did the release go out?
:::
::
```
::

::correct
```md
::conversation{me="Ada" platform="x"}
:::message{from="Grace"}
Did the release go out?
:::
::
```
::
