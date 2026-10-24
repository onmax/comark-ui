`mode` is how a compare shows its pair: `columns`, side by side, which is the default, or `slider`, laid over each other with a divider to drag. Any other mode shows columns.

::incorrect
```md
::compare{mode="overlay"}
:::screenshot{src="/pond-before.png" alt="The pond with no fence"}
:::

:::screenshot{src="/pond-after.png" alt="The pond with a fence"}
:::
::
```
::

::correct
```md
::compare{mode="slider"}
:::screenshot{src="/pond-before.png" alt="The pond with no fence"}
:::

:::screenshot{src="/pond-after.png" alt="The pond with a fence"}
:::
::
```
::
