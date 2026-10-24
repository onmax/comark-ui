Two elements with one id. A link to `#id` goes to the first, so the second can't be linked to. Comark numbers a heading whose id is taken, so this is always an id written as `{#id}`.

::incorrect
```md
## Setup

Install the duck counter.

## Pond setup {#setup}

Fill the pond.
```
::

::correct
```md
## Setup

Install the duck counter.

## Pond setup {#pond-setup}

Fill the pond.
```
::
