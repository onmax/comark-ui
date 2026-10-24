Hosts save answers and votes by the block's id. Without `#id`, the id is a hash of the prompt and options, so fixing a typo in either loses every reader's answer. Name the block once and keep the name.

::incorrect
```md
::poll
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::
```
::

::correct
```md
::poll{#next-lesson}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::
```
::
