A `::thread` draws only the `:::post` blocks inside it, so a paragraph, a list, or any other block between them is left out. Put the words in a post, or write them before or after the thread.

::incorrect
```md
::thread
:::post{platform="x" author="Ada"}
Starting a thread on the release.
:::

Ada then replied to herself:

:::post{platform="x" author="Ada"}
The parser is twice as fast.
:::
::
```
::

::correct
```md
Ada wrote a thread on the release:

::thread
:::post{platform="x" author="Ada"}
Starting a thread on the release.
:::

:::post{platform="x" author="Ada"}
The parser is twice as fast.
:::
::
```
::
