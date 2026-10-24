Each block reads only its own props: `id`, `multiple`, `number`, and `shuffle` on `::question`, `id`, `multiple`, and `closes` on `::poll`, and `id` and `number` on `::recall`. Any other prop is ignored, so a misspelled one changes nothing.

::incorrect
```md
::poll{#next-lesson deadline="2026-11-30"}
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
