A badge takes one of Nuxt UI's colors: `primary`, `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. Any other value, such as `red` or `purple`, shows as primary, so a warning looks like every other badge.

::incorrect
```md
The pond census is :badge[late]{color="red"} this year.
```
::

::correct
```md
The pond census is :badge[late]{color="error"} this year.
```
::
