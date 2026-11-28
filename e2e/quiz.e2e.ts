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
const open = async (
  page: Page,
  markdown: string,
  options: { script?: boolean; before?: string } = {},
) => {
  let html = await render(markdown);
  if (options.script === false) html = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><html lang="en"><body style="width:40rem;margin:2rem">${host}${options.before ?? ""}${html}</body></html>`,
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

const notePoll = poll.replace("::poll{#next-topic}", "::poll{#next-topic note}");
const mine = (page: Page) => page.locator(".cqz-mine");

test("a note goes with the vote, shows under the reader's pick, and an edit replaces it", async ({
  page,
}) => {
  await open(page, notePoll);
  const toggle = page.getByRole("button", { name: "Add a note" });
  await expect(toggle).toBeHidden();
  await send(page, { answers: {}, voting: { open: true } });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  const field = page.getByRole("textbox", { name: "Add a note to your vote" });
  await expect(field).toBeFocused();
  await field.fill("Streams would fix my uploads\nand my imports");
  await option(page, "Streams").click();
  const streams = await keyOf(page, "Streams");
  expect(await answers(page)).toEqual([
    {
      id: "next-topic",
      kind: "poll",
      choice: [streams],
      correct: null,
      first: true,
      note: "Streams would fix my uploads\nand my imports",
    },
  ]);
  await expect(field).toBeHidden();
  await expect(option(page, "Streams").locator(".cqz-mine")).toHaveText(
    "Your note: Streams would fix my uploads\nand my imports",
  );
  await expect(mine(page)).toBeVisible();
  const radio = page.getByRole("radio", { name: "Streams" });
  await expect(radio).toHaveAccessibleDescription(/Your note: Streams would fix my uploads/);

  // Editing after the vote sends the same vote with the new note, which replaces the old one.
  await page.getByRole("button", { name: "Edit note" }).click();
  await expect(field).toHaveValue("Streams would fix my uploads\nand my imports");
  await field.fill("Only uploads");
  await page.keyboard.press("ControlOrMeta+Enter");
  expect((await answers(page)).at(-1)).toEqual({
    id: "next-topic",
    kind: "poll",
    choice: [streams],
    correct: null,
    first: false,
    note: "Only uploads",
  });
  await expect(mine(page)).toHaveText("Your note: Only uploads");
  await expect(page.getByRole("button", { name: "Edit note" })).toBeFocused();

  // Escape closes the field without sending.
  await page.getByRole("button", { name: "Edit note" }).click();
  await field.fill("Never sent");
  await page.keyboard.press("Escape");
  await expect(field).toBeHidden();
  expect(await answers(page)).toHaveLength(2);
  await expect(mine(page)).toHaveText("Your note: Only uploads");

  // An empty note takes it back, and a changed vote keeps the note.
  await page.getByRole("button", { name: "Edit note" }).click();
  await expect(field).toHaveValue("Only uploads");
  await field.fill("Faster builds");
  await page.getByRole("button", { name: "Send note" }).click();
  await page.getByRole("button", { name: "Change vote" }).click();
  await expect(mine(page)).toBeHidden();
  await option(page, "Caching").click();
  const caching = await keyOf(page, "Caching");
  expect((await answers(page)).at(-1)).toMatchObject({ choice: [caching], note: "Faster builds" });
  await expect(option(page, "Caching").locator(".cqz-mine")).toHaveText("Your note: Faster builds");
  await page.getByRole("button", { name: "Edit note" }).click();
  await field.fill("  ");
  await page.getByRole("button", { name: "Send note" }).click();
  expect((await answers(page)).at(-1)).toMatchObject({ choice: [caching], note: "" });
  await expect(mine(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "Add a note" })).toBeVisible();
});

test("a note sent before a vote asks for one, and goes with the vote that follows", async ({
  page,
}) => {
  await open(page, notePoll);
  await send(page, { answers: {}, voting: { open: true } });
  await page.getByRole("button", { name: "Add a note" }).click();
  await page.getByRole("textbox").fill("Workers, for the image resizing");
  await page.getByRole("button", { name: "Send note" }).click();
  expect(await answers(page)).toEqual([]);
  await expect(page.getByText("Pick an option to send your note")).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeFocused();
  await option(page, "Workers").click();
  expect(await answers(page)).toMatchObject([{ note: "Workers, for the image resizing" }]);
  await expect(page.getByText("Pick an option to send your note")).toBeHidden();

  // A vote with no note sends an empty one.
  await open(page, notePoll);
  await send(page, { answers: {}, voting: { open: true } });
  await option(page, "Streams").click();
  expect(await answers(page)).toMatchObject([{ note: "" }]);
  await expect(mine(page)).toBeHidden();
});

test("a host's state restores the reader's note, and one that leaves note out keeps it", async ({
  page,
}) => {
  await open(page, notePoll);
  const streams = await keyOf(page, "Streams");
  const state: QuizState = {
    answers: { "next-topic": { choice: [streams!], note: "From last week" } },
    voting: { open: true },
  };
  await open(page, notePoll, {
    before: `<script>window.__comarkQuizState=${JSON.stringify(state)}</script>`,
  });
  await expect(option(page, "Streams").locator(".cqz-mine")).toHaveText(
    "Your note: From last week",
  );
  await page.getByRole("button", { name: "Edit note" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("From last week");
  await page.keyboard.press("Escape");

  await send(page, { answers: { "next-topic": { choice: [streams!] } } });
  await expect(mine(page)).toHaveText("Your note: From last week");
  await send(page, { answers: { "next-topic": { choice: [streams!], note: "Edited elsewhere" } } });
  await expect(mine(page)).toHaveText("Your note: Edited elsewhere");
  await send(page, { answers: { "next-topic": { choice: [streams!], note: "" } } });
  await expect(mine(page)).toBeHidden();
  expect(await answers(page)).toEqual([]);

  // Once voting closes, the field goes, and the note stays under the pick.
  await send(page, {
    answers: { "next-topic": { choice: [streams!], note: "Still mine" } },
    voting: { open: false },
  });
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "closed");
  await expect(page.getByRole("button", { name: "Edit note" })).toBeHidden();
  await expect(mine(page)).toHaveText("Your note: Still mine");
});

test("a choice-only host echo preserves a note across poll remounts", async ({ page }) => {
  await open(page, notePoll);
  const markup = (await render(notePoll)).replace(/<script>[\s\S]*?<\/script>/g, "");
  const remount = () =>
    page.evaluate((html) => (document.querySelector(".cqz")!.outerHTML = html), markup);
  await send(page, { answers: {} });
  await page.getByRole("button", { name: "Add a note" }).click();
  await page.getByRole("textbox").fill("For uploads");
  await option(page, "Streams").click();
  const [vote] = await answers(page);
  await send(page, { answers: { "next-topic": { choice: vote!.choice } } });
  await remount();
  await expect(mine(page)).toHaveText("Your note: For uploads");
  await page.getByRole("button", { name: "Change vote" }).click();
  await option(page, "Caching").click();
  const updated = (await answers(page)).at(-1)!;
  expect(updated).toMatchObject({ note: "For uploads" });

  await send(page, { answers: { "next-topic": { choice: updated.choice, note: "" } } });
  await send(page, { answers: { "next-topic": { choice: updated.choice } } });
  await remount();
  await expect(option(page, "Caching").getByRole("radio")).toBeChecked();
  await expect(page.getByRole("button", { name: "Add a note" })).toBeVisible();
  await expect(mine(page)).toBeHidden();
});

for (const submit of ["button", "shortcut", "vote"]) {
  test(`a poll cannot send an open note after the deadline via ${submit}`, async ({ page }) => {
    const start = new Date("2030-01-01T12:00:00Z");
    const deadline = new Date("2030-01-01T12:01:00Z");
    await page.clock.install({ time: start });
    await open(page, notePoll.replace(" note}", ` note closes="${deadline.toISOString()}"}`));
    await send(page, { answers: {} });
    await page.getByRole("button", { name: "Add a note" }).click();
    const field = page.getByRole("textbox");
    await field.fill("First note");
    await option(page, "Streams").click();
    await page.getByRole("button", { name: "Edit note" }).click();
    await field.fill("Too late");
    if (submit === "vote") await page.getByRole("button", { name: "Change vote" }).click();
    await page.clock.setSystemTime(deadline);
    if (submit === "button") await page.getByRole("button", { name: "Send note" }).click();
    else if (submit === "shortcut") await field.press("Control+Enter");
    else await option(page, "Caching").click();
    expect(await answers(page)).toMatchObject([{ note: "First note" }]);
    await expect(page.locator(".cqz")).toHaveAttribute("data-state", "closed");
    await expect(field).toBeHidden();
    await expect(option(page, "Streams").locator(".cqz-mine")).toHaveText("Your note: First note");
  });
}

test("sending a restored note enforces the length cap", async ({ page }) => {
  await open(page, notePoll);
  const streams = (await keyOf(page, "Streams"))!;
  const note = "x".repeat(500);
  await send(page, { answers: { "next-topic": { choice: [streams], note: ` ${note}y ` } } });
  await page.getByRole("button", { name: "Edit note" }).click();
  await page.getByRole("button", { name: "Send note" }).click();
  expect(await answers(page)).toMatchObject([{ note }]);
});

test("dismissing a draft clears the pick-first prompt", async ({ page }) => {
  await open(page, notePoll);
  await send(page, { answers: {} });
  const toggle = page.getByRole("button", { name: "Add a note" });
  const field = page.getByRole("textbox");
  const prompt = page.getByText("Pick an option to send your note");
  for (const dismiss of [() => field.press("Escape"), () => toggle.click()]) {
    await toggle.click();
    await field.fill("Discard me");
    await page.getByRole("button", { name: "Send note" }).click();
    await expect(prompt).toBeVisible();
    await dismiss();
    await expect(field).toBeHidden();
    await expect(prompt).toBeHidden();
  }
  await option(page, "Streams").click();
  expect(await answers(page)).toMatchObject([{ note: "" }]);
});

test("without the script, or without a host, a poll shows no note field", async ({ page }) => {
  await open(page, notePoll, { script: false });
  await expect(page.locator(".cqz-note")).toBeHidden();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await open(page, notePoll);
  await expect(page.locator(".cqz-note")).toBeHidden();
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

test("state a host leaves before the script starts is applied when it does", async ({ page }) => {
  const streams = /data-key="([\w-]+)"(?:(?!data-key)[\s\S])*?Streams/.exec(await render(poll))![1];
  const state: QuizState = {
    answers: { "next-topic": { choice: [streams!] } },
    voting: { open: true },
  };
  await open(page, poll, {
    before: `<script>window.__comarkQuizState=${JSON.stringify(state)}</script>`,
  });
  await expect(page.locator(".cqz")).toHaveAttribute("data-state", "voted");
  await expect(page.getByRole("radio", { name: "Streams" })).toBeChecked();
  await expect(page.getByText("Voting needs a host that collects votes.")).toBeHidden();
});

test("with data-quiz-relay, a framed lesson posts its events to the parent and takes its state", async ({
  page,
}) => {
  const lesson = `<!doctype html><html lang="en" data-quiz-relay="*"><body>${await render(poll)}</body></html>`;
  await page.goto("/no-such-page");
  // The parent answers each ready with its state, the way a host that keeps answers would.
  await page.setContent(
    `<!doctype html><script>window.messages=[];addEventListener("message",(e)=>{messages.push(e.data);if(e.data.type==="comark-quiz:ready")e.source.postMessage({type:"comark-quiz:state",detail:{voting:{open:true}}},"*")})</script><iframe srcdoc="${lesson.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" style="width:40rem;height:30rem"></iframe>`,
  );
  const frame = page.frameLocator("iframe");
  const messages = () =>
    page.evaluate(() => (window as unknown as { messages: unknown[] }).messages);
  await expect
    .poll(messages)
    .toEqual([{ type: "comark-quiz:ready", detail: { ids: ["next-topic"] } }]);
  await expect(frame.getByRole("radio").first()).toBeEnabled();
  await frame.locator(".cqz-option", { hasText: "Streams" }).click();
  const streams = await frame
    .locator(".cqz-option", { hasText: "Streams" })
    .getAttribute("data-key");
  await expect
    .poll(async () => (await messages()).at(-1))
    .toEqual({
      type: "comark-quiz:answer",
      detail: { id: "next-topic", kind: "poll", choice: [streams], correct: null, first: true },
    });
});

test("with data-quiz-relay, a framed poll posts its note to the parent and restores it from state", async ({
  page,
}) => {
  const lesson = `<!doctype html><html lang="en" data-quiz-relay="*"><body>${await render(notePoll)}</body></html>`;
  await page.goto("/no-such-page");
  await page.setContent(
    `<!doctype html><script>window.messages=[];addEventListener("message",(e)=>{messages.push(e.data);if(e.data.type==="comark-quiz:ready")e.source.postMessage({type:"comark-quiz:state",detail:{voting:{open:true}}},"*")})</script><iframe srcdoc="${lesson.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" style="width:40rem;height:30rem"></iframe>`,
  );
  const frame = page.frameLocator("iframe");
  const messages = () =>
    page.evaluate(() => (window as unknown as { messages: unknown[] }).messages);
  await frame.getByRole("button", { name: "Add a note" }).click();
  await frame.getByRole("textbox").fill("From the frame");
  await frame.locator(".cqz-option", { hasText: "Streams" }).click();
  const streams = await frame
    .locator(".cqz-option", { hasText: "Streams" })
    .first()
    .getAttribute("data-key");
  await expect
    .poll(async () => (await messages()).at(-1))
    .toEqual({
      type: "comark-quiz:answer",
      detail: {
        id: "next-topic",
        kind: "poll",
        choice: [streams],
        correct: null,
        first: true,
        note: "From the frame",
      },
    });
  await page.evaluate(
    (choice) =>
      document.querySelector("iframe")!.contentWindow!.postMessage(
        {
          type: "comark-quiz:state",
          detail: { answers: { "next-topic": { choice, note: "From the parent" } } },
        },
        "*",
      ),
    [streams!],
  );
  await expect(frame.locator(".cqz-mine")).toHaveText("Your note: From the parent");
});

for (const relay of ["data-quiz-relay", 'data-quiz-relay=""']) {
  test(`with ${relay}, a framed lesson keeps its events and ignores parent state`, async ({
    page,
  }) => {
    const lesson = `<!doctype html><html lang="en" ${relay}><body>${host}${await render(poll)}<script>addEventListener("message",(e)=>{if(e.data==="flushed")parent.postMessage("flushed","*")})</script></body></html>`;
    await page.goto("/no-such-page");
    await page.setContent(
      `<!doctype html><script>window.messages=[];addEventListener("message",(e)=>messages.push(e.data))</script><iframe srcdoc="${lesson.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" style="width:40rem;height:30rem"></iframe>`,
    );
    const frame = page.frameLocator("iframe");
    const messages = () =>
      page.evaluate(() => (window as unknown as { messages: unknown[] }).messages);
    await page.locator("iframe").evaluate((iframe: HTMLIFrameElement) => {
      iframe.contentWindow!.postMessage(
        { type: "comark-quiz:state", detail: { voting: { open: true } } },
        "*",
      );
      iframe.contentWindow!.postMessage("flushed", "*");
    });
    // The reply comes after the state message, so both directions have finished delivering.
    await expect.poll(messages).toContain("flushed");
    await expect(frame.getByRole("radio").first()).toBeDisabled();
    expect(await messages()).toEqual(["flushed"]);

    await frame.locator("html").evaluate(() => {
      window.__comarkQuiz!.apply({ voting: { open: true } });
    });
    await frame.locator(".cqz-option", { hasText: "Streams" }).click();
    expect(
      await frame
        .locator("html")
        .evaluate(() => (window as unknown as { answers: unknown[] }).answers),
    ).toHaveLength(1);
    await frame.locator("html").evaluate(() => window.parent.postMessage("answered", "*"));
    await expect.poll(async () => (await messages()).at(-1)).toBe("answered");
    expect(await messages()).toEqual(["flushed", "answered"]);
  });
}

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
