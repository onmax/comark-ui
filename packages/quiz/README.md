# comark-quiz

[![npm version](https://npmx.dev/api/registry/badge/version/comark-quiz)](https://npmx.dev/package/comark-quiz)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-quiz)](https://npmx.dev/package/comark-quiz)
[![install size](https://npmx.dev/api/registry/badge/size/comark-quiz)](https://npmx.dev/package/comark-quiz)
[![license](https://npmx.dev/api/registry/badge/license/comark-quiz)](https://npmx.dev/package/comark-quiz)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/quiz/)

Questions, polls, and recall cards for lessons written in Markdown. A reader checks an answer and sees why each option is right or wrong, votes in a poll, or tests themselves on a card whose answer stays blurred until they ask. A [Comark](https://comark.dev) plugin for HTML. It reads without a script.

```sh
pnpm add comark comark-quiz
```

```ts
import { createHtmlRenderer } from "@comark/html";
import quiz, { components } from "comark-quiz/html";

const render = createHtmlRenderer({ plugins: [quiz()], components });
```

Write the options as a task list, with a `>` reason under each one:

```md
::question{#event-loop-order}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
  > Promise callbacks are microtasks, which run before the next task.
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task, which waits for the microtasks.

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

A question's options are shuffled the same way for every reader, and each option gets a key from its text, so saved answers survive reordering. Questions and recall cards are numbered down the page. With no host, answers stay in `localStorage`. A host such as [Drop](https://drop.vitehub.dev) listens for `comark-quiz:answer`, sends `comark-quiz:state` back with saved answers, results, and whether voting is open, and reads `data-quiz-id`, `data-key`, and `data-correct` from the server's HTML. The plugin adds every problem to `meta.issues`, one sentence each naming the block and the fix, such as a question with no right option, a wrong option with no reason, or "All of the above", which the shuffle breaks.

Only the HTML renderer exists, since the blocks need its script.

## Customize

The styles follow shadcn/ui's Card and RadioGroup: they read its CSS variables, such as `--background`, `--border`, and `--primary`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme the blocks with the other comark plugins, and `--cqz-primary`, `--cqz-correct`, `--cqz-incorrect`, `--cqz-bar`, `--cqz-bar-strong`, and `--cqz-surface` for their own colors. Every part has a `data-slot` and every state a `data-state`. The rules sit in a `comark` CSS layer, so any plain rule of your own wins. The one exception is the first and last blocks inside the prompt, an option, a reason, the hint, the explanation, and the answer, which drop their margins with `!important` so a page's paragraph margins don't push them off the card's edges. See the [Theming page](https://comark-ui.onmax.me/quiz/#theme).

The icons are [Lucide](https://lucide.dev)'s, under its license (see `LICENSE`).

Docs and live demos: [comark-ui.onmax.me/quiz](https://comark-ui.onmax.me/quiz).
