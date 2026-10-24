An `:::accordion-item` outside `::accordion` renders on its own, as a `::details` would, so it doesn't line up or open with the items it was meant to join. The closing `::` of the accordion is usually too early.

::incorrect
```md
:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::
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
