import { createHtmlRenderer } from "@comark/html";
import { createServer } from "node:http";
import { expect, type Page, test } from "@playwright/test";
import quiz, {
  components,
  type QuizAnswerDetail,
  type QuizState,
} from "../packages/quiz/src/html.ts";

const render = createHtmlRenderer({ plugins: [quiz()], components });
// A host's listener, in the page before the blocks, so it hears the first `comark-quiz:ready` too.
const host = `<script>window.answers=[];document.addEventListener("comark-quiz:answer",(e)=>answers.push(e.detail));document.addEventListener("comark-quiz:ready",(e)=>{window.ready=e.detail.ids})</script>`;
// A page of its own for each case, on the docs site's origin so the blocks can save answers. Not a docs page:
// `setContent` keeps the window, and with it the running script.
const open = async (page: Page, markdown: string, options: { script?: boolean } = {}) => {
  let html = await render(markdown);
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html lang="en"><body style="width:40rem;margin:2rem">${host}${html}</body></html>`,
  );
};
const answers = (page: Page) =>
  page.evaluate(() => (window as unknown as { answers: QuizAnswerDetail[] }).answers);
const send = (page: Page, state: QuizState) =>
  page.evaluate(
    (detail) => document.dispatchEvent(new CustomEvent("comark-quiz:state", { detail })),
    state,
  );
const keyOf = (page: Page, text: string) =>
  page.locator(".cqz-option", { hasText: text }).getAttribute("data-key");

const question = `::question{#event-loop}
Which callback runs first?

- [x] A promise's \`then\` callback
  > Promise callbacks are microtasks.
- [ ] A \`setTimeout\` callback
  > A timer queues a task.
- [ ] A \`requestAnimationFrame\` callback
  > It runs before the next paint.

#explain
Microtasks drain before the next task.
::`;
const poll = `::poll{#next-topic}
What next?

- [ ] Workers
- [ ] Streams
- [ ] Caching
::`;
const recall = `::recall{#why}
Why does \`then\` run first?

#answer
Microtasks drain before the next task.
::`;

const option = (page: Page, text: string) => page.locator(".cqz-option", { hasText: text });

test("a right answer is marked, explained, and sent to the host", async ({ page }) => {
  await open(page, question);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { ready: string[] }).ready))
    .toEqual(["event-loop"]);
  // Check is never disabled: with nothing selected, it says what's missing.
  const check = page.getByRole("button", { name: "Check" });
  await check.click();
  await expect(page.getByRole("status")).toHaveText("Select an answer");
  expect(await answers(page)).toEqual([]);
  await page.getByRole("radio", { name: "A promise's then callback" }).check();
  await expect(page.getByRole("status")).toHaveText("");
  await check.click();
  await expect(option(page, "promise")).toHaveAttribute("data-state", "correct");
  // The status line says the verdict once; the right pick has its icon and tint, and no word.
  await expect(page.getByRole("status")).toHaveText("Correct");
  await expect(option(page, "promise").locator(".cqz-verdict")).toHaveText("");
  await expect(
    option(page, "promise").getByText("Promise callbacks are microtasks."),
  ).toBeVisible();
  await expect(page.getByText("Microtasks drain before the next task.")).toBeVisible();
  await expect(page.getByText("A timer queues a task.")).toBeHidden();
  // The radios stay in the tab order, but no longer change.
  const timer = page.getByRole("radio", { name: /setTimeout/ });
  await expect(timer).toHaveAttribute("aria-disabled", "true");
  await option(page, "setTimeout").click();
  await expect(timer).not.toBeChecked();
  expect(await answers(page)).toEqual([
    {
      id: "event-loop",
      kind: "question",
      choice: [await keyOf(page, "promise")],
      correct: true,
      first: true,
    },
  ]);
});

test("a wrong answer shows why, then Try again clears it for another go", async ({ page }) => {
  await open(page, question);
  await option(page, "setTimeout").click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(option(page, "setTimeout")).toHaveAttribute("data-state", "incorrect");
  await expect(page.getByRole("status")).toHaveText("Not quite");
  await expect(option(page, "setTimeout").locator(".cqz-verdict")).toHaveText("Your answer");
  await expect(option(page, "setTimeout").getByText("A timer queues a task.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check" })).toBeHidden();
  const retry = page.getByRole("button", { name: "Try again" });
  await expect(retry).toBeFocused();
  await expect(page.getByRole("button", { name: "Show answer" })).toBeVisible();
  await expect(page.getByText("Microtasks drain before the next task.")).toBeHidden();

  await retry.click();
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "idle");
  await expect(page.getByRole("radio", { name: /setTimeout/ })).not.toBeChecked();
  await expect(page.getByRole("status")).toHaveText("");
  await option(page, "promise").click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(option(page, "promise")).toHaveAttribute("data-state", "correct");
  const sent = await answers(page);
  expect(sent.map(({ correct, first }) => [correct, first])).toEqual([
    [false, true],
    [true, false],
  ]);
});

test("Show answer marks every right option and opens each reason and the explanation", async ({
  page,
}) => {
  await open(page, question);
  await option(page, "requestAnimationFrame").click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "revealed");
  await expect(option(page, "promise")).toHaveAttribute("data-state", "revealed");
  await expect(option(page, "promise").locator(".cqz-verdict")).toHaveText("Correct answer");
  await expect(option(page, "requestAnimationFrame").locator(".cqz-verdict")).toHaveText(
    "Your answer",
  );
  for (const reason of [
    "Promise callbacks are microtasks.",
    "A timer queues a task.",
    "It runs before the next paint.",
  ])
    await expect(page.getByText(reason)).toBeVisible();
  await expect(page.getByText("Microtasks drain before the next task.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /promise/ })).toHaveAttribute(
    "aria-describedby",
    /.+/,
  );
  expect((await answers(page)).at(-1)).toMatchObject({ choice: [], correct: false, first: false });
});

test("arrow keys move the selection without checking it", async ({ page }) => {
  await open(page, question);
  const radios = page.getByRole("radio");
  await radios.first().focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeChecked();
  expect(await answers(page)).toEqual([]);
  await page.keyboard.press("Enter");
  expect(await answers(page)).toHaveLength(1);
});

test("a poll waits for a host, then votes, shows its results, and changes the vote", async ({
  page,
}) => {
  await open(page, poll);
  const radios = page.getByRole("radio");
  await expect(radios.first()).toBeDisabled();
  await expect(page.getByText("Voting needs a host that collects votes.")).toBeVisible();

  await send(page, { answers: {}, voting: { open: true } });
  await expect(radios.first()).toBeEnabled();
  await expect(page.getByText("Voting needs a host that collects votes.")).toBeHidden();
  // Arrow keys only move focus here, since a selection is a vote.
  await radios.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeFocused();
  expect(await answers(page)).toEqual([]);

  await option(page, "Streams").click();
  const streams = await keyOf(page, "Streams");
  expect(await answers(page)).toEqual([
    { id: "next-topic", kind: "poll", choice: [streams], correct: null, first: true },
  ]);
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "voted");
  await expect(page.locator(".cqz")).not.toHaveAttribute("data-results");

  const [workers, caching] = [await keyOf(page, "Workers"), await keyOf(page, "Caching")];
  await send(page, {
    results: {
      "next-topic": { counts: { [workers!]: 1, [streams!]: 6, [caching!]: 1 }, total: 8 },
    },
  });
  await expect(page.locator(".cqz")).toHaveAttribute("data-results", "");
  await expect(option(page, "Streams").locator(".cqz-percent")).toHaveText("75%");
  await expect(option(page, "Workers").locator(".cqz-percent")).toHaveText("13%");
  await expect(option(page, "Streams")).toHaveAttribute("data-leading", "");
  await expect(option(page, "Streams")).toHaveAttribute("data-state", "voted");
  await expect(page.getByRole("status")).toHaveText("8 votes");

  await page.getByRole("button", { name: "Change vote" }).click();
  await expect(page.locator(".cqz")).not.toHaveAttribute("data-results");
  await option(page, "Caching").click();
  expect((await answers(page)).at(-1)).toMatchObject({ choice: [caching], first: false });
  await expect(page.locator(".cqz")).toHaveAttribute("data-results", "");
});

test("a host closes voting, and an empty choice takes a vote back", async ({ page }) => {
  await open(page, poll);
  const streams = await keyOf(page, "Streams");
  await send(page, { answers: { "next-topic": { choice: [streams!] } }, voting: { open: true } });
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "voted");
  await send(page, { answers: { "next-topic": { choice: [] } }, voting: { open: true } });
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "idle");
  await expect(page.getByRole("radio", { name: "Streams" })).not.toBeChecked();

  await send(page, { answers: {}, voting: { open: false, notice: "Sign in to vote" } });
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "closed");
  await expect(page.getByText("Sign in to vote")).toBeVisible();
  await option(page, "Workers").click();
  await expect(page.getByRole("radio", { name: "Workers" })).not.toBeChecked();
  expect(await answers(page)).toEqual([]);
});

test("a recall card keeps its answer blurred and out of reach until it's shown, then takes a grade", async ({
  page,
}) => {
  await open(page, recall);
  const answer = page.locator(".cqz-reveal");
  await expect(answer).toHaveAttribute("aria-hidden", "true");
  expect(await answer.evaluate((node) => (node as HTMLElement).inert)).toBe(true);
  await expect(answer).toHaveCSS("filter", "blur(6px)");
  await expect(page.locator("details")).toHaveCount(0);

  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(answer).toHaveAttribute("aria-hidden", "false");
  await expect(answer).toBeFocused();
  await expect(page.getByRole("button", { name: "Show answer" })).toBeHidden();
  const knew = page.getByRole("button", { name: "I knew it" });
  await knew.click();
  await expect(knew).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Not yet" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect((await answers(page)).map(({ choice, correct }) => [choice, correct])).toEqual([
    [["revealed"], null],
    [["knew"], true],
  ]);
});

test("without a host, answers come back from localStorage, with no motion", async ({
  page,
  context,
}) => {
  await open(page, `${question}\n\n${recall}`);
  await option(page, "promise").click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Show answer" }).click();

  const again = await context.newPage();
  await open(again, `${question}\n\n${recall}`);
  await expect(again.locator('[data-quiz-id="event-loop"]')).toHaveAttribute(
    "data-state",
    "correct",
  );
  await expect(again.locator('[data-quiz-id="why"]')).toHaveAttribute("data-state", "revealed");
  await expect(again.getByRole("radio", { name: /promise/ })).toBeChecked();
  expect(await again.evaluate(() => document.getAnimations().length)).toBe(0);
  expect(await answers(again)).toEqual([]);
});

test("a host's state replaces localStorage and restores answers and results with no motion", async ({
  page,
  context,
}) => {
  await open(page, `${question}\n\n${recall}`);
  await option(page, "setTimeout").click();
  await page.getByRole("button", { name: "Check" }).click();

  const again = await context.newPage();
  await open(again, `${question}\n\n${recall}`);
  const block = again.locator('[data-quiz-id="event-loop"]');
  await expect(block).toHaveAttribute("data-state", "incorrect");
  const promise = await keyOf(again, "promise");
  const timer = await keyOf(again, "setTimeout");
  await expect.poll(() => again.evaluate(() => document.getAnimations().length)).toBe(0);
  // An answer the host has, with results, lands at once; the one from localStorage gives way to it.
  await send(again, {
    answers: { "event-loop": { choice: [promise!], correct: true } },
    results: { "event-loop": { counts: { [promise!]: 3, [timer!]: 1 }, total: 4 } },
  });
  await expect(block).toHaveAttribute("data-state", "correct");
  await expect(block).toHaveAttribute("data-results", "");
  expect(await again.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(option(again, "promise").locator(".cqz-percent")).toHaveText("75%");
  await expect(block.getByRole("status")).toContainText("4 answers");
  await expect(again.getByRole("button", { name: "Check" })).toBeHidden();

  // Once a host has sent state, answers go to it alone.
  await again.getByRole("button", { name: "Show answer" }).click();
  expect((await answers(again)).at(-1)).toMatchObject({ id: "why", choice: ["revealed"] });
  expect(
    await again.evaluate(() => localStorage.getItem("comark-quiz:/no-such-page:why")),
  ).toBeNull();
});

test("without the script, the options read as a list and Show answer opens the key", async ({
  page,
}) => {
  await open(page, question, { script: false });
  await expect(page.getByRole("button", { name: "Check" })).toBeHidden();
  await expect(page.getByRole("radio")).toHaveCount(3);
  const details = page.locator("details", { hasText: "Show answer" });
  await expect(details.getByText("Promise callbacks are microtasks.")).toBeHidden();
  await details.locator("summary").click();
  await expect(details.getByText("Correct answer")).toBeVisible();
  await expect(details.getByText("A timer queues a task.")).toBeVisible();
  await expect(details.getByText("Microtasks drain before the next task.")).toBeVisible();
});

test("a block that reaches the browser in two pieces is read once it's whole", async ({ page }) => {
  const html = await render(`${question}\n\n${recall}`);
  // The cut falls inside the recall card, before its answer arrives.
  const cut = html.indexOf("<details", html.indexOf('data-quiz-kind="recall"'));
  const server = createServer((_, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.write(`<!doctype html><html lang="en"><body>${html.slice(0, cut)}`);
    setTimeout(() => response.end(`${html.slice(cut)}</body></html>`), 300);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await page.goto(`http://127.0.0.1:${address instanceof Object ? address.port : 0}/`);
    await expect(page.locator(".cqz-reveal .cqz-answer")).toHaveText(
      "Microtasks drain before the next task.",
    );
    await expect(page.locator("details")).toHaveCount(0);
    await expect(page.locator(".cqz-options .cqz-rationale")).toHaveCount(3);
  } finally {
    server.close();
  }
});
