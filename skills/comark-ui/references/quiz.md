# Lessons and quizzes

comark-quiz adds `::question`, `::poll`, and `::recall` blocks for interactive lessons. Questions check one or more answers and explain each option, polls collect votes, and recall cards reveal an answer for self-testing. Without its script, the prompt, options, and answer disclosure remain readable HTML.

## Syntax

```md
::question{#event-loop-order}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
  > Promise callbacks are microtasks.
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task.

#hint
Two queues are involved.

#explain
After every task, the event loop empties the microtask queue.
::

::poll{#next-lesson}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams
::

::recall{#why-microtasks}
Why does a promise callback run before a zero-delay timer?

#answer
Promise callbacks are microtasks, and a timer's callback is a task.
::
```

A question uses radios when one option is marked `[x]`; `multiple` makes it a checkbox question. Options are shuffled deterministically unless `shuffle="false"`. Questions and recall cards share numbering, while polls are not numbered. A missing id is derived from the block content. Use `#hint` and `#explain` on questions, and `#answer` on recall cards. Polls accept `multiple` and a date in `closes`.

The HTML renderer inlines the quiz script and styles. Hosts can listen for `comark-quiz:answer` and `comark-quiz:ready`, and restore answers or results with `comark-quiz:state`; see [Saving answers](https://comark-ui.onmax.me/quiz/#saving-answers) on its page for the event shapes and storage behavior.

## Register

- In `comark-ui`: on, as `quiz`, with optional `{ labels }` for translated UI text.
- Alone: `pnpm add comark @comark/html comark-quiz`, then `createHtmlRenderer({ plugins: [quiz()], components })` with `quiz, { components }` from `comark-quiz/html`. The HTML renderer is required because the blocks need its inlined script; there are no Vue, React, or Svelte entries.
