A `::compare` shows a before and an after, so it takes exactly two screenshots. With one, there's nothing to compare it to; with three or more, readers can't tell which pair to look at.

::incorrect
```md
::compare
:::screenshot{src="/pond-after.png" alt="The pond with a fence"}
:::
::
```
::

::correct
```md
::compare
:::screenshot{src="/pond-before.png" alt="The pond with no fence"}
:::

:::screenshot{src="/pond-after.png" alt="The pond with a fence"}
:::
::
```
::
