A compare whose two screenshots are the same image shows no change, which usually means the after capture was never taken or its path was copied from the before one.

::incorrect
```md
::compare
:::screenshot{src="/pond.png" alt="The pond with no fence"}
:::

:::screenshot{src="/pond.png" alt="The pond with a fence"}
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
