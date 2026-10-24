A poll closes after its `closes` date, read as an ISO date such as `2026-11-30` or `2026-11-30T18:00:00Z`. A value that isn't one is ignored, so the poll stays open.

::incorrect
```md
::poll{#next-lesson closes="end of November"}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::
```
::

::correct
```md
::poll{#next-lesson closes="2026-11-30"}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::
```
::
