An accordion's `type` is `multiple`, the default, where every item can be open at once, or `single`, where opening one closes the others. Any other value counts as `multiple`.

::incorrect
```md
::accordion{type="one"}
:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::

:::accordion-item{label="Can I swim in the pond?"}
No, it's the ducks' pond.
:::
::
```
::

::correct
```md
::accordion{type="single"}
:::accordion-item{label="Can I feed the ducks?"}
Only oats and peas.
:::

:::accordion-item{label="Can I swim in the pond?"}
No, it's the ducks' pond.
:::
::
```
::
