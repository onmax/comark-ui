A question's options are shuffled, so an option that points at others by place, such as "All of the above" or "Both A and B", stops making sense. Write out what it means, or split the question.

::incorrect
```md
::question{#falsy}
Which value is falsy?

- [x] `0`
- [ ] `[]`
  > Every object is truthy, empty arrays too.
- [ ] None of the above
  > One of them is falsy.
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
- [ ] `"0"`
  > A string with any character in it is truthy.
::
```
::
