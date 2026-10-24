A `::question` or `::poll` reads its options from a task list, one `- [ ]` or `- [x]` item each. Without one there is nothing to pick, and a plain list without the brackets stays part of the prompt.

::incorrect
```md
::poll{#next-lesson}
What should the next lesson cover?

- Web Workers
- Streams
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
