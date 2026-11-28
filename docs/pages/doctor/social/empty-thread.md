A `::thread` shows its `:::post` blocks, or, with the `fetch` option, the posts its `url` replies to. With neither, it has nothing to show and renders nothing. Write a `:::post` for each post in the thread.

::incorrect
```md
::thread
::
```
::

::correct
```md
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
