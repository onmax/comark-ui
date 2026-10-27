import { deflateRawSync, inflateRawSync } from "node:zlib";
import { expect, type Page, test } from "@playwright/test";

const source = "::question{#event-loop-order shuffle}\nUpdated question\n- [x] Yes\n- [ ] No\n::";
const decode = (code: string) => inflateRawSync(Buffer.from(code, "base64url")).toString();
const state = (url: string) => {
  const code = new URL(url).searchParams.get("edit");
  return code ? JSON.parse(decode(code)) : {};
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: async (text: string) => {
        document.documentElement.dataset.copiedLink = text;
      },
    });
  });
});

async function openQuestion(page: Page) {
  await page.goto("/play/gallery/?scheme=light#quiz-question");
  await page.locator("#quiz-question").getByRole("button", { name: "Edit props" }).click();
}

async function editAndClick(page: Page, action: "play" | "share", duplicate = false) {
  // Both events run in one task, before either debounce or asynchronous compression can finish.
  await page.evaluate(
    ({ source, action, duplicate }) => {
      if (duplicate)
        document
          .querySelector<HTMLButtonElement>('.gallery-inspector [data-action="duplicate"]')!
          .click();
      const textarea = document.querySelector<HTMLTextAreaElement>(".gallery-source textarea")!;
      textarea.value = source;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      document
        .querySelector<HTMLElement>(
          action === "play" ? '.gallery-inspector [data-action="play"]' : ".gallery-link",
        )!
        .click();
    },
    { source, action, duplicate },
  );
}

test("adding a gallery prop preserves ID-only and class-only shorthand", async ({ page }) => {
  await openQuestion(page);
  const markdown = page.getByRole("textbox", { name: "Markdown", exact: true });
  const original = await markdown.inputValue();
  expect(original).toContain("::question{#event-loop-order}");
  for (const shorthand of ["#event-loop-order", ".question"]) {
    await markdown.fill(original.replace("#event-loop-order", shorthand));
    const add = page.getByRole("combobox", { name: "Add a prop to question", exact: true });
    await add.fill("shuffle");
    await add.press("Enter");
    await expect(markdown).toHaveValue(
      original.replace("#event-loop-order", `${shorthand} shuffle`),
    );
  }
});

test("a duplicated cell keeps subsequent edits when its URL reloads", async ({ page }) => {
  await openQuestion(page);
  await page.getByRole("dialog").getByRole("button", { name: "Duplicate", exact: true }).click();
  await page.getByRole("textbox", { name: "Markdown", exact: true }).fill(source);
  await expect.poll(() => state(page.url()).added?.[0]?.source).toBe(source);
  await page.reload();
  await page.locator("#quiz-question--1").getByRole("button", { name: "Edit props" }).click();
  await expect(page.getByRole("textbox", { name: "Markdown", exact: true })).toHaveValue(source);
});

test("Copy link includes an edit and a duplicate made in the same task", async ({ page }) => {
  await openQuestion(page);
  await editAndClick(page, "share", true);
  await expect(page.locator("html")).toHaveAttribute("data-copied-link", /[?&]edit=/);
  const copied = await page.locator("html").getAttribute("data-copied-link");
  expect(state(copied!).added[0]).toMatchObject({ id: "quiz-question--1", source });
  const reopened = await page.context().newPage();
  await reopened.goto(copied!);
  await reopened.locator("#quiz-question--1").getByRole("button", { name: "Edit props" }).click();
  await expect(reopened.getByRole("textbox", { name: "Markdown", exact: true })).toHaveValue(
    source,
  );
});

test("Playground opens the Markdown from the immediately preceding input event", async ({
  page,
}) => {
  await openQuestion(page);
  await editAndClick(page, "play");
  await expect(page).toHaveURL(/\/play\/#md=/);
  expect(decode(new URLSearchParams(new URL(page.url()).hash.slice(1)).get("md")!)).toBe(source);
});

test("a modified Playground click keeps its new tab and the edited Markdown", async ({ page }) => {
  await openQuestion(page);
  await page.getByRole("textbox", { name: "Markdown", exact: true }).fill(source);
  const opened = page.waitForEvent("popup");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Open in the playground" })
    .click({
      modifiers: ["Control"],
    });
  const tab = await opened;
  await expect(tab).toHaveURL(/\/play\/#md=/);
  expect(decode(new URLSearchParams(new URL(tab.url()).hash.slice(1)).get("md")!)).toBe(source);
  await expect(page).toHaveURL(/\/play\/gallery\//);
});

for (const support of ["missing", "throws"] as const) {
  test(`gallery link actions explain ${support} raw-deflate support`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((support) => {
      Object.defineProperty(globalThis, "CompressionStream", {
        value:
          support === "missing"
            ? undefined
            : class {
                constructor() {
                  throw new TypeError("Unsupported compression format");
                }
              },
      });
    }, support);
    await openQuestion(page);
    await editAndClick(page, "share");
    await expect(page.getByRole("alert")).toContainText("raw deflate is not supported");
    await expect(page.locator("html")).not.toHaveAttribute("data-copied-link");
    await page.getByRole("dialog").getByRole("link", { name: "Open in the playground" }).click();
    await expect(page.getByRole("alert")).toContainText("Could not open the playground.");
    await expect(page).toHaveURL(/\/play\/gallery\//);
    expect(errors).toEqual([]);
  });

  test(`incoming gallery edits explain ${support} raw-deflate support`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((support) => {
      Object.defineProperty(globalThis, "DecompressionStream", {
        value:
          support === "missing"
            ? undefined
            : class {
                constructor() {
                  throw new TypeError("Unsupported compression format");
                }
              },
      });
    }, support);
    const code = deflateRawSync(JSON.stringify({ edits: { "quiz-question": source } })).toString(
      "base64url",
    );
    await page.goto(`/play/gallery/?edit=${code}`);
    await expect(page.getByRole("alert")).toContainText("Could not load the edits from this link.");
    await expect(page.getByRole("alert")).toContainText("raw deflate is not supported");
    await expect(page.locator(".gallery")).not.toHaveAttribute("data-busy");
    expect(errors).toEqual([]);
  });
}

test("an invalid incoming gallery link reports that its edits could not load", async ({ page }) => {
  await page.goto("/play/gallery/?edit=invalid");
  await expect(page.getByRole("alert")).toContainText("Could not load the edits from this link.");
  await expect(page.locator(".gallery")).not.toHaveAttribute("data-busy");
});
