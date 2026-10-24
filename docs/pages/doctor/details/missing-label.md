An accordion item's `label` is its summary, the line readers click to open it. Without one, the item shows "Item 1", "Item 2", and so on.

::incorrect
```md
::accordion
:::accordion-item
Only oats and peas.
:::
::
```
::

::correct
```md
::accordion
:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::
::
```
::
