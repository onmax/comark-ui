An `::accordion` with no `:::accordion-item` inside renders an empty box. Add its items, or remove it.

::incorrect
```md
::accordion
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
