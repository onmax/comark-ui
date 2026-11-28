A line under an option without `>` is a second line of the option's own text. On a wrong option with no reason, it's usually the reason missing its `>`, and the reader would see it before they answer. Start the line with `>` to make it the option's reason. An option with a reason, or a right one, can break its text onto two lines.

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
