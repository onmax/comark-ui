---
title: Quiz
description: Questions, polls, and recall cards for lessons written in Markdown.
tagline: A question, poll, or recall card that checks what a reader learned, and reads without a script.
group: Docs blocks
icon: graduation-cap
blurb: Questions, polls, and recall cards
credits: 'For lessons in the style of <a href="https://github.com/mattpocock/skills/tree/main/skills/productivity/teach">Matt Pocock''s teach skill</a>.'
---

::examples
:::example{label="Question"}
```md
::question{#event-loop-order}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
  > Promise callbacks are microtasks, and the microtask queue empties before the next task.
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task, which waits until the microtask queue is empty.
- [ ] A `requestAnimationFrame` callback
  > It runs before the next paint, after the tasks already queued.

#hint
Two queues are involved. Which one empties first?

#explain
After every task, the event loop runs each queued microtask before it takes the next task, so a promise callback beats a zero-delay timer.
::
```
:::

:::example{label="Poll"}
```md
::poll{#next-lesson}
What should the next lesson cover?

- [ ] Web Workers
- [ ] The `scheduler.yield()` API
- [ ] Streams and backpressure
::
```
:::

:::example{label="Recall"}
```md
::recall{#why-microtasks}
Why does a promise callback run before a zero-delay timer?

#answer
Promise callbacks are microtasks. The event loop empties the microtask queue after every task, before it takes the next one, and a timer's callback is a task.
::
```
:::
::

## Features

- A question is a task list with a reason under each option, answered with a Check button.
- A right answer shows its reason and the explanation. A wrong one shows why it's wrong, with Try again and Show answer.
- Every reader sees the same shuffle, and saved answers still match after the author reorders the options.
- Polls collect votes through a host, and recall cards blur an answer until the reader asks for it.
- Every block is open on the page. Without the script, the options are a plain list and the answer sits in a Show answer disclosure.

## Usage

Write a `::question` with a prompt, then a task list of options: `- [x]` for a right one and `- [ ]` for a wrong one.

::example
```md
::question{#first-callback}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task, which waits for the microtasks.
::
```
::

The prompt, everything before the options, can hold any Markdown, even code blocks.

### Question

#### Reasons

Use a `>` line under an option to say why it's right or wrong. The reader sees it after checking that option, and Show answer reveals them all. Options and reasons can hold inline code, links, images, and citations.

::example
```md
::question{#first-callback-why}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
  > Promise callbacks are microtasks, and the microtask queue empties before the next task.
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task, which waits until the microtask queue is empty.
::
```
::

> [!NOTE]
> A wrong option with no reason adds an issue, and so does an option that runs onto a second line, usually a reason missing its `>`.

#### Id

Use the `#id` prop to set the id a host saves answers by. Without one, the id changes with the prompt or options, and the plugin adds an issue.

```md
::question{#event-loop-order}
```

#### Multiple

Use the `multiple` prop to show checkboxes even with one right option, so the control doesn't give away how many are right. Without it, one right option makes radios and several make checkboxes.

::example
```md
::question{#queues-microtasks multiple}
Which of these queue a microtask?

- [x] `queueMicrotask(fn)`
- [ ] `setTimeout(fn, 0)`
  > A timer queues a task.
- [ ] `requestAnimationFrame(fn)`
  > It runs before the next paint, as a frame callback.
::
```
::

#### Shuffle

Use `shuffle="false"` to keep the order you wrote, for options such as a scale.

::example
```md
::question{#then-calls shuffle="false"}
How many times does `then(fn)` call `fn` once the promise resolves?

- [ ] Never
  > A resolved promise calls each `then` callback.
- [x] Once
- [ ] Twice
  > A promise settles once, so each callback runs once.
::
```
::

#### Number

Use `number="false"` to leave the block out of the count. Questions and recall cards share one count down the page, and polls aren't numbered.

::example
```md
::question{#warm-up number="false"}
Is JavaScript in a page single-threaded?

- [x] Yes, on its main thread
- [ ] No, every callback gets a thread
  > Callbacks wait their turn on the main thread.
::
```
::

#### Hint

Use the `#hint` slot to put a hint behind a Hint button.

::example
```md
::question{#first-callback-hint}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task, which waits for the microtasks.

#hint
Two queues are involved. Which one empties first?
::
```
::

#### Explanation

Use the `#explain` slot to add an explanation, which opens after a right answer or Show answer.

::example
```md
::question{#first-callback-explain}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task, which waits for the microtasks.

#explain
After every task, the event loop empties the microtask queue.
::
```
::

> [!NOTE]
> Leave a blank line before `#hint` and `#explain`. Without it, the text above swallows the slot, and the plugin adds an issue.

### Poll

Use `::poll` to collect votes. Its options are a task list with none marked, kept in the order you wrote. Picking one is the vote, with no Check button. Results show after the vote, which the reader can change until voting closes.

::example
```md
::poll{#next-topic}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams and backpressure
::
```
::

> [!NOTE]
> A poll needs a host that collects votes, such as [Drop](https://drop.vitehub.dev). Without one, its options show disabled.

#### Multiple

Use the `multiple` prop to show checkboxes, so a reader can vote for several options. Percentages count over voters.

```md
::poll{#next-topics multiple}
```

#### Closes

Use the `closes` prop to close voting on an ISO date. After it, the poll shows as closed.

```md
::poll{#next-lesson closes="2026-11-30"}
```

> [!NOTE]
> A `closes` that isn't a date never closes the poll, and adds an issue.

### Recall

Use `::recall` to have the reader answer from memory. The `#answer` stays blurred until Show answer. Then I knew it and Not yet record how it went. It takes `#id` and `number` like a question.

::example
```md
::recall{#why-promise-first}
Why does a promise callback run before a zero-delay timer?

#answer
Promise callbacks are microtasks, and a timer's callback is a task.
::
```
::

> [!NOTE]
> A recall card with no `#answer` adds an issue.

## Examples

### A lesson

This lesson explains why `await` doesn't let a page paint with [steps](/steps/), a [callout](/github/), and [citations](/sources/), then checks it with a question and a recall card:

::examples
:::example{label="Lesson"}
```md
A promise callback never runs in the middle of other code. It waits in the microtask queue :cite[1], and the browser empties that queue at a fixed point in each turn of the event loop.

::steps
### A task runs
The current script, or one event handler, runs to its end.

### Microtasks run
Every queued promise callback runs, and so do the ones they queue :cite[1].

### The page may paint
Only now can the browser render, then take the next task :cite[2].
::

> [!TIP]
> A long chain of microtasks keeps the page from painting just like one long task does.

::question{#lesson-paint}
Which line lets the browser paint before the rest of the work runs?

- [x] `await new Promise((r) => setTimeout(r))`
  > The timer's callback is a new task, so the page can paint before it.
- [ ] `await Promise.resolve()`
  > It queues a microtask, and microtasks all run before the page paints.
- [ ] `queueMicrotask(() => next())`
  > A microtask still runs before the browser takes its turn to paint.

#explain
Only a new task gives the browser a turn to paint. Microtasks, however many, run first.
::

::recall{#lesson-drain}
When does the browser run the microtask queue?

#answer
After every task, before it renders or takes the next task :cite[1].
::

::sources
1. [Using microtasks in JavaScript](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
2. [Event loops in the HTML standard](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
::
```
:::
::

### Writing the questions

- **Knowledge first, then practice.** Explain the idea with sources, then ask about it while it's fresh. A recall card near the end asks again from memory, which makes it stick.
- **Give every wrong option a reason.** It's the lesson for a reader who picked it, so say what the option gets wrong.
- **Make the options look alike.** Keep them about the same length and form, so the right one doesn't stand out. The plugin reports a right option much longer than the rest.
- **Don't point at other options.** The shuffle breaks "All of the above" and "Both A and B". Write out what you mean.
- **Give each block an id.** Hosts save answers by id, so an edited lesson keeps its readers' answers. Keep the id when you reword the prompt.
- **Cite the claims.** comark-sources' `:cite` works in prompts, options, reasons, and answers.

### Order and keys

Every reader, and the page without its script, sees the same shuffled order. Reordering options keeps saved answers, but editing an option's words resets the answers that picked it.

### Hosting

Opened as a file, a lesson keeps answers in the reader's browser. In [Drop](https://drop.vitehub.dev), answers follow the reader across devices, polls collect votes, and questions show how everyone answered. Other hosts can do the same with the [events](#events) in [Saving answers](#saving-answers).

## Accessibility

A question or poll is a `fieldset` of radios or checkboxes, labelled by its number and prompt, or the prompt alone for a poll. The status line under the options is a live region, so a screen reader hears the verdict once after each check, with the count of answers when a host sends results.

A state never relies on color alone. It also gets an icon, a border, and a tint, and the status line says the verdict in words.

Focus follows what the reader does:

- After Check, focus goes to the first selected option in rendered order on a right answer, or to Try again on a wrong one.
- Try again sends focus to the first option, and Show answer to the first right option.
- Change vote sends focus to the reader's vote.
- On a recall card, Show answer sends focus to the answer.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab`, `Shift+Tab` | Moves focus between the options and the buttons. |
| `Space` | Picks the focused option. In a poll, it casts the vote. |
| `Enter` | On an option, checks a question's answer, or casts a poll's vote. |
| `ArrowDown`, `ArrowRight` | Picks the next radio of a question. In a poll's radios, or in options locked after an answer, it moves focus to the next option without picking it, and wraps around. |
| `ArrowUp`, `ArrowLeft` | Picks the previous radio of a question. In a poll's radios, or in locked options, it moves focus to the previous option without picking it. |

In right-to-left text, `ArrowLeft` and `ArrowRight` swap.

## API

### Props

#### `::question`

| Prop | Default | Description |
| --- | --- | --- |
| `#id` | Derived from the prompt and options | The block's id, which a host saves answers by. |
| `multiple` | `true` with several right options, else `false` | Shows checkboxes, even with one right option. |
| `number` | `true` | `number="false"` leaves the block out of the count. |
| `shuffle` | `true` | `shuffle="false"` keeps the order you wrote. |

#### `::poll`

| Prop | Default | Description |
| --- | --- | --- |
| `#id` | Derived from the prompt and options | The block's id, as for a question. |
| `multiple` | `false` | Shows checkboxes, with percentages over voters. |
| `closes` | — | An ISO date. After it, the poll shows as closed. |

#### `::recall`

| Prop | Default | Description |
| --- | --- | --- |
| `#id` | Derived from the prompt | The block's id, as for a question. |
| `number` | `true` | `number="false"` leaves the block out of the count. |

### Slots

| Slot | Description |
| --- | --- |
| `#hint` | A question's hint, behind a Hint button. |
| `#explain` | A question's explanation, which opens after a right answer or Show answer. |
| `#answer` | A recall card's answer, blurred until the reader presses Show answer. Required. |

### Options

Pass options under `quiz` in `comarkUi()`, or to `quiz()` when you use the plugin alone. Every word the blocks show is a label you can translate:

```ts
quiz({ labels: { check: "Comprobar", tryAgain: "Otra vez", showAnswer: "Ver respuesta" } });
```

| Label | Default |
| --- | --- |
| `check` | `"Check"` |
| `selectAnswer` | `"Select an answer"`, said when Check is pressed with nothing picked |
| `tryAgain` | `"Try again"` |
| `showAnswer` | `"Show answer"` |
| `hint` | `"Hint"` |
| `correct` | `"Correct"` |
| `notQuite` | `"Not quite"` |
| `yourAnswer` | `"Your answer"` |
| `correctAnswer` | `"Correct answer"` |
| `vote`, `votes` | `"{count} vote"`, `"{count} votes"`, under a poll's results |
| `answer`, `answers` | `"{count} answer"`, `"{count} answers"`, under a question's results |
| `changeVote` | `"Change vote"` |
| `knewIt` | `"I knew it"` |
| `notYet` | `"Not yet"` |
| `noHost` | `"Voting needs a host that collects votes."` |
| `closed` | `"Voting closed"` |

Each label you leave out keeps its English default.

### Saving answers

With no host, each answer stays in the reader's browser, in `localStorage` under `comark-quiz:<path>:<id>`. In a sandboxed frame, where storage throws or forgets, the blocks still work for the visit.

A host such as [Drop](https://drop.vitehub.dev) keeps the answers instead and sends back how everyone answered, through the [events](#events) on `document`.

The server's HTML has what a host needs to check a posted answer: `data-quiz-id` and `data-quiz-kind` on each block, `data-key` on each option, and `data-correct` on a question's right options.

### Events

| Event | Sent by | Detail |
| --- | --- | --- |
| `comark-quiz:ready` | The script, once the page's blocks are in, and again for blocks added later | `{ ids: string[] }` |
| `comark-quiz:answer` | Each block, bubbling and crossing shadow roots | `{ id, kind, choice, correct, first }` |
| `comark-quiz:state` | The host | `{ answers?, results?, voting? }` |

An answer's `choice` holds option keys. A question sends one on every Check, and `choice: []` with `correct: false` on Show answer. A poll sends its choice on every vote, with `correct: null`. A recall card sends `["revealed"]`, then `["knew"]` or `["missed"]`. `first` is true for the first answer to a block on a page view.

The state the host sends looks like this:

```ts
document.dispatchEvent(
  new CustomEvent("comark-quiz:state", {
    detail: {
      answers: { "event-loop-order": { choice: ["1x9k2ab"], correct: true } },
      results: { "next-lesson": { counts: { "7ym8b3": 12, "1hxx01f": 30 }, total: 42 } },
      voting: { open: true, notice: "Votes close on Friday" },
    },
  }),
);
```

- **Answers** restore with no motion. An empty `choice` takes an answer back, except a question's `choice: []` with `correct: false`, which is a shown answer. Once the first state arrives, the script stops using `localStorage`.
- **Results** show after a question's right answer or Show answer, and after a poll's vote. A poll with `multiple` counts percentages over voters, so send the number of voters as `total`.
- **Voting** opens polls. With `open: false`, polls show their results and `notice`, and send no votes. Questions and recall cards still work.

### Functions

| Function | Description |
| --- | --- |
| `window.__comarkQuiz.apply(state)` | Does what `comark-quiz:state` does, as a function call. |
| `window.__comarkQuiz.ids()` | Lists the ids of the blocks on the page. |

### Issues

The plugin adds each problem to `meta.issues`, as [Validation](/guide/validation/) describes, and each kind has its own rule in [Doctor](/doctor/):

- a question with no `[x]`, or a poll with one
- a question or poll with no options
- a recall card with no `#answer`
- a block with no `#id`, or one another block has
- a right option much longer than the others, which gives it away
- an option such as "All of the above" that points at other options by place, which the shuffle breaks
- a wrong option with no `>` reason
- an option that runs onto a second line, usually a reason missing its `>`
- a `#explain` or `#hint` swallowed by the text above it, when the blank line before it is missing
- more than six options
- a poll's `closes` that isn't a date
- a prop or slot the block doesn't have, and a block inside another

### Package

comark-ui brings `comark-quiz` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-quiz
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import quiz, { components } from "comark-quiz/html";

const render = createHtmlRenderer({ plugins: [quiz()], components });
```

Only the HTML renderer exists. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Each block is styled like shadcn/ui's Card and follows the shared tokens in [Theming](/guide/theming/), dark mode included. Only state adds color: primary for a selection, green for right, red for wrong, and a fill for results. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The options and outline buttons |
| `--comark-foreground` | Text |
| `--comark-muted` | The number, reasons, hints, and the counts |
| `--comark-border` | The card, the options, and the line over the explanation |
| `--comark-accent` | Hovered options and buttons, and a pressed grade |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners, a little rounder on the card and less on the options |
| `--comark-font` | All of it |

### Variables

Set these on `.cqz` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cqz-primary` | `--comark-primary` | A selected option, the Check button, a poll vote |
| `--cqz-primary-foreground` | `--comark-primary-foreground` | Text on the Check button, and a checked box's tick |
| `--cqz-correct` | `--comark-success` | A right option's border and tint |
| `--cqz-incorrect` | `--comark-danger` | A wrong pick's border and tint |
| `--cqz-correct-foreground` | `--cqz-correct` at 55% mixed with `--comark-foreground` | Correct icons and verdict text |
| `--cqz-incorrect-foreground` | `--cqz-incorrect` at 55% mixed with `--comark-foreground` | Incorrect icons and verdict text |
| `--cqz-bar` | `--comark-foreground` at 6% | Each option's share of the results |
| `--cqz-bar-strong` | The primary color at 14% | A poll's leading option and the reader's vote |
| `--cqz-surface` | `--comark-foreground` at 2% over `--comark-background` | The card |

A state's tint is 8% of its color.

### Slots and states

Every part has a `data-slot`, and the block and each option a `data-state`:

| Selector | Is |
| --- | --- |
| `[data-slot="root"]` | The block, `.cqz`, with `data-quiz-id`, `data-quiz-kind` (`question`, `poll`, or `recall`), `data-state`, and `data-results` once results show |
| `[data-slot="number"]`, `[data-slot="prompt"]` | The number and the prompt |
| `[data-slot="options"]` | The `fieldset` of options |
| `[data-slot="option"]` | Each option, with `data-key`, `data-state`, `data-correct` on a question's right ones, and `data-leading` on a poll's most chosen |
| `[data-slot="indicator"]` | The radio or checkbox, and the icon that replaces it once answered |
| `[data-slot="label"]`, `[data-slot="rationale"]` | An option's text and its reason |
| `[data-slot="verdict"]`, `[data-slot="percent"]`, `[data-slot="bar"]` | An option's label ("Your answer" or "Correct answer"), percent, and fill |
| `[data-slot="actions"]`, `[data-slot="status"]` | The buttons, and the status line with the verdict and count of answers, read out after each check |
| `[data-slot="hint"]`, `[data-slot="explain"]`, `[data-slot="answer"]` | The slots |
| `[data-slot="footer"]`, `[data-slot="total"]`, `[data-slot="notice"]` | A poll's footer, with the vote count and the host's notice |
| `[data-slot="reveal"]` | A recall card's answer, blurred until it's shown |

| `data-state` | On |
| --- | --- |
| `idle`, `selected` | A block or option before a check |
| `correct`, `incorrect` | A block after a check, and each checked option |
| `revealed` | A question after Show answer, its right options the reader didn't pick, and a recall card once shown |
| `voted`, `closed` | A poll after a vote or once voting closes, and the reader's options |

Buttons have `data-variant` (`default`, `outline`, `ghost`, or `link`) and `data-action`. `<html>` gets `data-quiz-ready` once the script runs.

A recall card also gets `data-grade` (`knew` or `missed`) once the reader grades it.

### Important rules

Only one declaration uses `!important`. It drops the top and bottom margins of the first and last blocks in the prompt, options, reasons, hint, explanation, and answer. A page's plain paragraph rules would otherwise beat the layer and push the text off the card's edges.

### Example

A brand color for selections and the Check button, and calmer results:

```css
:root {
  --cqz-primary: oklch(0.55 0.2 260);
  --cqz-bar-strong: oklch(0.55 0.2 260 / 0.12);
}
```
