A line under an option without `>` joins the option's own text, so the reader sees the reason before they answer. Start the line with `>` to make it the option's reason.

::incorrect
```md
::question{#falsy}
Which value is falsy?

- [x] `0`
- [ ] `[]`
  Every object is truthy, empty arrays too.
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
