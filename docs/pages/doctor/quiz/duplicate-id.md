Two blocks with one id share their saved answers and results, so answering one changes the other. Give each block an id of its own.

::incorrect
```md
::poll{#lesson-poll}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::

::poll{#lesson-poll}
How long should it be?

- [ ] Five minutes
- [ ] Fifteen minutes
::
```
::

::correct
```md
::poll{#next-topic}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::

::poll{#next-length}
How long should it be?

- [ ] Five minutes
- [ ] Fifteen minutes
::
```
::
