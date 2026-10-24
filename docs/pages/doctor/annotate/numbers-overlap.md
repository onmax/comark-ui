Each number sits on a corner of its mark, on the first corner that's clear of the other numbers. When marks crowd one spot so closely that two numbers would cover each other at every corner, readers can't tell which note goes with which mark.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=40 y=40 w=10 h=10}
Duck 1 on the rock.
:::
:::annotation{x=40 y=40 w=10 h=10}
Duck 2 on the rock.
:::
:::annotation{x=40 y=40 w=10 h=10}
Duck 3 on the rock.
:::
:::annotation{x=40 y=40 w=10 h=10}
Duck 4 on the rock.
:::
:::annotation{x=40 y=40 w=10 h=10}
Duck 5 on the rock.
:::
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks"}
:::annotation{x=40 y=40 w=10 h=10}
Five ducks share the rock.
:::
::
```
::
