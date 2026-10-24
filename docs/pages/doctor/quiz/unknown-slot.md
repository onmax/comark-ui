A question reads `#hint` and `#explain`, and a recall card `#answer`; a poll has no slots. A slot with any other name is dropped with its content.

::incorrect
```md
::question{#falsy}
Which value is falsy?

- [x] `0`
- [ ] `[]`
  > Every object is truthy, empty arrays too.

#explanation
JavaScript has eight falsy values.
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

#explain
JavaScript has eight falsy values.
::
```
::
