Without a blank line before it, `#explain` or `#hint` continues the reason above it as plain text, so the explanation shows inside an option instead of after the answer. Leave a blank line before every slot.

::incorrect
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
