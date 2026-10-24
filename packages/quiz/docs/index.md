---
title: Quiz
description: Questions, polls, and recall cards for lessons written in Markdown.
tagline: Write a question as a task list with a reason under each option, and readers check their answer and see why. Polls collect votes, and recall cards hide an answer until the reader asks. All of it reads without a script.
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

Pick an option and press Check. A right answer shows its reason and the explanation; a wrong one shows why it's wrong, with Try again and Show answer. The verdict is said once, in the line under the options. The options are shuffled the same way for every reader, and each one gets a key from its text, so an answer saved today still matches after the author reorders them.

A poll needs a host that collects votes, such as [Drop](https://drop.vitehub.dev): without one, its options show disabled. Once a host sends results, a question shows how every reader answered and a poll shows its results the way a social network does. A recall card blurs its answer until the reader asks for it, then asks whether they knew it.

Questions and recall cards share one count, so a lesson numbers them 1, 2, 3 down the page. Every block is open on the page as the reader scrolls. Without the script, the options are a plain list and the answer sits in a Show answer disclosure.

## Usage

### Question

```md
::question{#event-loop-order}
Which callback runs first once the current script ends?

- [x] A resolved promise's `then` callback
  > Promise callbacks are microtasks. :cite[1]
- [ ] A `setTimeout(fn, 0)` callback
  > A timer queues a task, which waits for the microtasks.

#hint
Two queues are involved.

#explain
After every task, the event loop empties the microtask queue.
::
```

The prompt is everything before the options, and can hold any Markdown, code blocks included. The options are a task list: `- [x]` for a right one and `- [ ]` for a wrong one. One right option makes radios; several, or `multiple`, make checkboxes, and with `multiple` the control doesn't tell how many are right.

Under each option, a `>` line says why it's right or wrong. The reader sees it after checking that option, and every one after Show answer. An option and its reason can hold inline code, links, images, and citations.

| Prop | |
| --- | --- |
| `#id` | The block's id, which a host saves answers by. Without one, the id is a hash of the prompt and options, so it changes when they do. |
| `multiple` | Checkboxes, even with one right option. |
| `number` | `number="false"` leaves the block out of the count. |
| `shuffle` | `shuffle="false"` keeps the order you wrote, for options such as a scale. |

| Slot | |
| --- | --- |
| `#hint` | Behind a Hint button, for a reader who's stuck. |
| `#explain` | Opens after a right answer or Show answer. |

### Poll

```md
::poll{#next-lesson closes="2026-11-30"}
What should the next lesson cover?

- [ ] Web Workers
- [ ] Streams and backpressure
::
```

A poll has the same options with none marked, and no Check button: picking an option is the vote. It keeps the order you wrote. Its results show once the reader votes, and the vote can change until voting closes.

| Prop | |
| --- | --- |
| `#id` | The block's id, as for a question. |
| `multiple` | Checkboxes, with percentages over voters. |
| `closes` | An ISO date. After it, the poll shows as closed. |

### Recall

```md
::recall{#why-microtasks}
Why does a promise callback run before a zero-delay timer?

#answer
Promise callbacks are microtasks, and a timer's callback is a task.
::
```

The `#answer` stays blurred until the reader presses Show answer, then I knew it and Not yet record how it went. Its props are `#id` and `number`.

### Order and keys

A question's options are shuffled with a seed from its id and its options' text, so every reader, and the page without its script, sees one order. Writing them in another order doesn't change it. Each option's key is a hash of its text, so a saved answer still matches after the options move, and stops matching when an option's words change.

Questions and recall cards are numbered in the order they appear. Polls aren't numbered.

### Issues

The plugin adds each problem to `meta.issues`, as [Validation](/guide/validation/) describes, and each kind has its own rule in [Doctor](/doctor/):

- a question with no `[x]`, or a poll with one
- a recall card with no `#answer`
- a block with no `#id`, or one another block has
- a right option much longer than the others, which gives it away
- an option such as "All of the above" that points at other options by place, which the shuffle breaks
- a wrong option with no `>` reason
- an option that runs onto a second line, usually a reason missing its `>`
- a `#explain` or `#hint` swallowed by the text above it, when the blank line before it is missing
- more than six options
- a prop or slot the block doesn't have, and a block inside another

## Examples

### A lesson

A lesson teaches one thing, then has the reader use it right away. This one explains why `await` doesn't let a page paint, with numbered [steps](/steps/), a [callout](/github/), and [citations](/sources/), then checks it with a question and a recall card:

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

- **Knowledge first, then practice.** Explain the one idea with sources, then ask about it while it's fresh. A recall card near the end asks for it again from memory, which is what makes it stick.
- **Give every wrong option a reason.** The reason is the lesson for a reader who picked it, so say what that option gets wrong, not only that it's wrong.
- **Make the options look alike.** Keep them about as long as each other and in the same form, so the right one doesn't stand out. The plugin reports a right option that's much longer than the rest.
- **Don't point at other options.** The options are shuffled, so "All of the above" or "Both A and B" stops making sense. Write out what you mean.
- **Give each block an id.** Answers are saved by id, so a lesson you edit keeps its readers' answers. Keep the id when you reword the prompt.
- **Cite the claims.** comark-sources' `:cite` works in prompts, options, reasons, and answers.

### Hosting

Opened as a file, a lesson keeps the reader's answers in their browser. In [Drop](https://drop.vitehub.dev), answers follow the reader across devices, polls collect votes, and each question shows how everyone answered. Any other host can do the same through the events in [Saving answers](#saving-answers).

## API

These options go under `quiz` in `comarkUi()`, or to `quiz()` when you use the plugin alone. Every word the blocks show is an option, so a host can translate them:

```ts
quiz({ labels: { check: "Comprobar", tryAgain: "Otra vez", showAnswer: "Ver respuesta" } });
```

The labels are `check`, `selectAnswer`, `tryAgain`, `showAnswer`, `hint`, `correct`, `notQuite`, `yourAnswer`, `correctAnswer`, `vote` and `votes` (`"{count} votes"`), `answer` and `answers` (`"{count} answers"`), `changeVote`, `knewIt`, `notYet`, `noHost`, and `closed`.

### Saving answers

With no host, each answer stays in the reader's browser, in `localStorage` under `comark-quiz:<path>:<id>`. In a sandboxed frame, where storage throws or forgets, the blocks still work for the visit.

A host such as [Drop](https://drop.vitehub.dev) keeps the answers instead, and sends back how everyone answered. It talks to the script through events on `document`:

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
- **Results** show once the reader has answered: a question's after a right answer or Show answer, a poll's after a vote. A poll with `multiple` counts percentages over voters, so send the number of voters as `total`.
- **Voting** opens polls. With `open: false`, polls show their results and `notice`, and send no votes; questions and recall cards still work.

`window.__comarkQuiz.apply(state)` does the same as the event, for a host that would rather call a function, and `window.__comarkQuiz.ids()` lists the blocks on the page.

The server's HTML carries what a host needs to check a posted answer: `data-quiz-id` and `data-quiz-kind` on each block, `data-key` on each option, and `data-correct` on a question's right options.

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

The renderer inlines the styles and a small script once per document. Only the HTML renderer exists: the blocks need the script to check answers, so Vue, React, and Svelte versions would each carry it again. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Every block is a card in the style of shadcn/ui's Card, with options like its RadioGroup, so it follows the shared tokens in [Theming](/guide/theming/) and turns dark with them. Color comes only from state: the primary color for a selection, green for right, red for wrong, and a fill for results. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The options and outline buttons |
| `--comark-foreground` | Text, and the primary color when the page has none |
| `--comark-muted` | The number, reasons, hints, and the counts |
| `--comark-border` | The card, the options, and the line over the explanation |
| `--comark-accent` | Hovered options and buttons, and a pressed grade |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners: the card's a little rounder, the options' a little less |
| `--comark-font` | All of it |

### Variables

Set these on `.cqz` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cqz-primary` | Nuxt UI's `--ui-primary`, else shadcn/ui's `--primary`, else `--comark-foreground` | A selected option, the Check button, a poll vote |
| `--cqz-primary-foreground` | `--primary-foreground`, else `--comark-background` | Text on the Check button, and a checked box's tick |
| `--cqz-correct` | `--ui-success`, else `--success`, else `oklch(0.62 0.14 155)` | A right option's icon, border, and tint, and the "Correct" verdict |
| `--cqz-incorrect` | `--ui-error`, else `--destructive`, else shadcn/ui's red | A wrong pick's icon, border, and tint, and the "Not quite" verdict |
| `--cqz-bar` | `--comark-foreground` at 6% | Each option's share of the results |
| `--cqz-bar-strong` | The primary color at 14% | A poll's leading option and the reader's vote |
| `--cqz-surface` | `--comark-foreground` at 2% over `--comark-background` | The card |

A state's color always comes with an icon, a border, and a tint of 8%, and the status line under the options says the verdict in words, so color never carries it alone.

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
| `[data-slot="actions"]`, `[data-slot="status"]` | The buttons, and the status line: the verdict and the count of answers, read out after each check |
| `[data-slot="hint"]`, `[data-slot="explain"]`, `[data-slot="answer"]` | The slots |
| `[data-slot="footer"]`, `[data-slot="total"]`, `[data-slot="notice"]` | A poll's footer: the count of votes and the host's notice |
| `[data-slot="reveal"]` | A recall card's answer, blurred until it's shown |

| `data-state` | On |
| --- | --- |
| `idle`, `selected` | A block or option before a check |
| `correct`, `incorrect` | A block after a check, and each checked option |
| `revealed` | A question after Show answer, its right options the reader didn't pick, and a recall card once shown |
| `voted`, `closed` | A poll after a vote or once voting closes, and the reader's options |

Buttons carry `data-variant` (`default`, `outline`, `ghost`, or `link`) and `data-action`. `<html>` gets `data-quiz-ready` once the script runs.

A recall card also gets `data-grade` (`knew` or `missed`) once the reader grades it.

Only one kind of declaration uses `!important`: the first and last blocks of the prompt, an option, a reason, the hint, the explanation, and the answer drop their top and bottom margins. A page's paragraph margins are almost always plain rules, which beat the layer, and would push the text off the card's edges.

### Example

A brand color for selections and the Check button, and calmer results:

```css
:root {
  --cqz-primary: oklch(0.55 0.2 260);
  --cqz-bar-strong: oklch(0.55 0.2 260 / 0.12);
}
```
