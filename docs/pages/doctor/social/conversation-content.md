A `::conversation` draws only the `:::message` blocks inside it, so a paragraph, a list, or any other block between them is left out. Put the words in a message, or write them before or after the conversation.

::incorrect
```md
::conversation{me="Ada" platform="x"}
:::message{from="Grace"}
Did the release go out?
:::

Ada answered an hour later:

:::message{from="Ada"}
It did, this morning.
:::
::
```
::

::correct
```md
Ada answered an hour later:

::conversation{me="Ada" platform="x"}
:::message{from="Grace"}
Did the release go out?
:::

:::message{from="Ada"}
It did, this morning.
:::
::
```
::
