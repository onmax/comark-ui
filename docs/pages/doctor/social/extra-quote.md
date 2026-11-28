A `:::post` inside a `::post` is the post it quotes, and a post quotes one. A second `:::post` isn't shown, and neither is a post inside a quoted post. To show several posts, write each as its own `::post`, or put them in a `::thread` when each replies to the one before.

::incorrect
```md
::post{platform="x" author="Ada"}
Both of these.

:::post{author="Grace"}
The first.
:::

:::post{author="Alan"}
The second.
:::
::
```
::

::correct
```md
::post{platform="x" author="Ada"}
This one.

:::post{author="Grace"}
The first.
:::
::

::post{platform="x" author="Alan"}
The second.
::
```
::
