A block inside another block's prompt, option, or slot would put its options among the outer block's, where a host can't tell them apart, so it renders as plain text. Put it after the outer block.

::incorrect
```md
::recall{#why-microtasks}
Why does a promise callback run before a zero-delay timer?

#answer
A promise callback is a microtask.

:::poll{#next-lesson}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
:::
::
```
::

::correct
```md
::recall{#why-microtasks}
Why does a promise callback run before a zero-delay timer?

#answer
A promise callback is a microtask.
::

::poll{#next-lesson}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::
```
::
