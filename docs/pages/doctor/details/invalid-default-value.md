`defaultValue` lists the items that start open by their position, counted from 0, as Nuxt UI takes them. A label, or a position past the last item, opens nothing.

::incorrect
```md
::accordion{defaultValue="1"}
:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::
::
```
::

::correct
```md
::accordion{defaultValue="0"}
:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::
::
```
::
