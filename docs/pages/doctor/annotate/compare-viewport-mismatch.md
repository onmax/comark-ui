Screenshots captured at different sizes lay the page out differently, so what moved between them can't be told from what the size changed. Capture both at the same viewport.

::incorrect
```md
::compare
:::screenshot{src="/pond.svg" alt="The pond with no fence" viewport="1440x900"}
:::

:::screenshot{src="/pond-fence.svg" alt="The pond with a fence" viewport="1280x800"}
:::
::
```
::

::correct
```md
::compare
:::screenshot{src="/pond.svg" alt="The pond with no fence" viewport="1440x900"}
:::

:::screenshot{src="/pond-fence.svg" alt="The pond with a fence" viewport="1440x900"}
:::
::
```
::
