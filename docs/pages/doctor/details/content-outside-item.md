An `::accordion` renders only its `:::accordion-item` blocks, so text written between them, or before the first, is dropped. It usually belongs in an item, or above the accordion.

::incorrect
```md
::accordion
Questions about the pond.

:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::
::
```
::

::correct
```md
Questions about the pond.

::accordion
:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::
::
```
::
