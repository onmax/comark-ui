A recall card blurs its `#answer` until the reader asks for it. Without the slot, Show answer reveals nothing and the card has no buttons.

::incorrect
```md
::recall{#why-microtasks}
Why does a promise callback run before a zero-delay timer?
::
```
::

::correct
```md
::recall{#why-microtasks}
Why does a promise callback run before a zero-delay timer?

#answer
A promise callback is a microtask, and microtasks run before the next task.
::
```
::
