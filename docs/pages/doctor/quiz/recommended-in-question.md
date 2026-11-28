A question checks what the reader knows, so a pill on one option hands them the answer. The plugin drops the mark. Mark the right option `[x]`, or ask it as a `::poll`, where `{recommended}` shows your pick.

::incorrect
```md
::question{#falsy}
Which value is falsy?

- [x] `0` {recommended}
- [ ] `[]`
  > Every object is truthy, empty arrays too.
::
```
::

::correct
```md
::question{#falsy}
Which value is falsy?

- [x] `0`
- [ ] `[]`
  > Every object is truthy, empty arrays too.
::
```
::
