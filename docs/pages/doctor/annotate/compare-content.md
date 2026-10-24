A `::compare` lays out its two screenshots and nothing else, so text or other blocks inside it are dropped. Write them before or after the compare.

::incorrect
```md
::compare
The pond before and after the fence.

:::screenshot{src="/pond-before.png" alt="The pond with no fence"}
:::

:::screenshot{src="/pond-after.png" alt="The pond with a fence"}
:::
::
```
::

::correct
```md
The pond before and after the fence.

::compare
:::screenshot{src="/pond-before.png" alt="The pond with no fence"}
:::

:::screenshot{src="/pond-after.png" alt="The pond with a fence"}
:::
::
```
::
