# Lessons and quizzes

comark-quiz adds `::question`, `::poll`, and `::recall` blocks for interactive lessons. A question checks one or more answers and explains each option, a poll collects votes, and a recall card hides an answer until the reader asks for it. Without the script, the prompt, options, and answer disclosure stay readable HTML.

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

| Block | Props and slots |
| --- | --- |
| `::question` | `#id`, `multiple`, `shuffle="false"`, `number="false"`, slots `#hint` and `#explain`. |
| `::poll` | `#id`, `multiple`, `closes` (an ISO date; after it the poll shows as closed). Options are never shuffled. |
| `::recall` | `#id`, `number="false"`, and the required slot `#answer`. |

- Mark a right option `[x]` and a wrong one `[ ]`. One right option makes radios and several make checkboxes; `multiple` forces checkboxes even with one. Mark no option in a poll.
- Put a `>` line under an option to say why it is right or wrong. Give every wrong option a reason, since that is the lesson for a reader who picked it.
- Leave a blank line before `#hint` and `#explain`. Without it, the text above swallows the slot, and the plugin reports it.
- Give every block an `#id`. Hosts save answers by id. Without one the id derives from the prompt and options, changes when you reword them, and the plugin reports it. Keep the id when you reword the prompt.
- Questions and recall cards share one count, so a lesson numbers them 1, 2, 3 down the page. Polls are not numbered.
- Options are shuffled the same way for every reader, so do not write options that point at others by place, such as "All of the above" or "Both A and B". Keep the options about as long as each other, since a right option much longer than the rest is reported.
- Keep a block to six options or fewer. Mark at least one right option in a question, or ask it as a poll. Put no block inside another block's prompt, option, or slot.

The HTML renderer inlines the quiz script and styles. Hosts can listen for `comark-quiz:answer` and `comark-quiz:ready`, and restore answers or results with `comark-quiz:state`; see [Saving answers](https://comark-ui.onmax.me/quiz/#saving-answers) on its page for the event shapes and storage behavior.

## Register

- In `comark-ui`: on, as `quiz`, with optional `{ labels }` for translated UI text.
- Alone: `pnpm add comark @comark/html comark-quiz`, then `createHtmlRenderer({ plugins: [quiz()], components })` with `quiz, { components }` from `comark-quiz/html`. Use the HTML renderer, since the blocks need its inlined script; there are no Vue, React, or Svelte entries.
