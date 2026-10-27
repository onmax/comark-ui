import { expect, test } from "@playwright/test";

test.use({ colorScheme: "light" });

test("the gallery shows every example in light and dark, and the filter narrows it", async ({
  page,
}) => {
  await page.goto("/play/gallery/");
  await page.getByRole("button", { name: "Both", exact: true }).click();
  const item = page.locator("#tabs-tabs");
  const background = (scheme: string) =>
    item
      .locator(`.gallery-frame[data-scheme=${scheme}][data-ready]`)
      .evaluate((frame: HTMLIFrameElement) =>
        getComputedStyle(frame.contentDocument!.body).getPropertyValue("background-color"),
      );
  await item.scrollIntoViewIfNeeded();
  // The dark frame is dark though the system is light.
  await expect.poll(() => background("light")).toBe("rgb(255, 255, 255)");
  await expect.poll(() => background("dark")).not.toBe("rgb(255, 255, 255)");
  await expect(item.locator(".gallery-frame[data-scheme=dark]")).toBeVisible();

  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(item.locator(".gallery-frame[data-scheme=light]")).toBeHidden();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.locator(".sidebar").getByRole("searchbox", { name: "Filter components" }).fill("tabs");
  await expect(item).toBeVisible();
  await expect(page.locator("#annotate-before-after")).toBeHidden();
  await expect(page.locator('.sidebar [data-gallery="annotate-before-after"]')).toBeHidden();
});

test("the inspector changes a prop, spreads one into copies, and a link keeps the changes", async ({
  page,
}) => {
  await page.goto("/play/gallery/?scheme=light");
  const gallery = page.locator(".gallery");
  const cell = page.locator("#annotate-marks");
  const marks = (id: string, mark: string) =>
    page.locator(`#${id}`).frameLocator(".gallery-frame[data-scheme=light]").locator(`.ca-${mark}`);
  await cell.getByRole("button", { name: "Edit props" }).click();
  const inspector = page.getByRole("dialog", { name: "Marks" });
  const markdown = inspector.getByRole("textbox", { name: "Markdown" });
  await expect(markdown).toHaveValue(/mark="circle"/);

  // The mark is a select of the values annotate's docs list for it.
  const mark = inspector.getByRole("combobox", { name: "annotation mark" }).first();
  await expect(mark).toHaveValue("circle");
  await mark.selectOption("bracket");
  await expect(markdown).toHaveValue(/mark="bracket"/);
  await expect(gallery).not.toHaveAttribute("data-busy");
  await expect(marks("annotate-marks", "bracket")).toHaveCount(1);
  await expect(marks("annotate-marks", "circle")).toHaveCount(0);

  await inspector
    .locator(".gallery-prop")
    .filter({ has: page.getByRole("combobox", { name: "annotation mark" }) })
    .first()
    .getByRole("button", { name: "Spread" })
    .click();
  // Every other documented value starts checked; typing one with a comma checks its chip.
  const values = inspector.getByRole("group", { name: "Values of mark" });
  await expect(values.getByRole("checkbox", { name: "circle", exact: true })).toBeChecked();
  await inspector.getByRole("button", { name: "Select none" }).click();
  await values.getByRole("checkbox", { name: "circle", exact: true }).check();
  await values.getByRole("textbox", { name: "Add a value of mark" }).fill("check,");
  await expect(values.getByRole("checkbox", { name: "check", exact: true })).toBeChecked();
  await inspector.getByRole("button", { name: "Add 2 copies" }).click();
  await expect(page.locator("#annotate-marks--1 h3")).toHaveText("Marks · mark=circle");
  await expect(page.locator("#annotate-marks--2 h3")).toHaveText("Marks · mark=check");
  await expect(gallery).not.toHaveAttribute("data-busy");
  await expect(marks("annotate-marks--1", "circle")).toHaveCount(1);
  await expect(marks("annotate-marks--2", "check")).toHaveCount(2);
  await expect(page).toHaveURL(/[?&]edit=/);

  await page.goto(page.url());
  await expect(gallery).not.toHaveAttribute("data-busy");
  await expect(marks("annotate-marks", "bracket")).toHaveCount(1);
  await expect(page.locator("#annotate-marks--2 h3")).toHaveText("Marks · mark=check");
  await expect(marks("annotate-marks--2", "check")).toHaveCount(2);

  await page.getByRole("button", { name: "Clear changes" }).click();
  await expect(page.locator("#annotate-marks--1")).toHaveCount(0);
  await expect(marks("annotate-marks", "circle")).toHaveCount(1);
  await expect(page).not.toHaveURL(/[?&]edit=/);
});

test("the inspector is a window that moves, resizes, and keeps its place", async ({ page }) => {
  await page.goto("/play/gallery/?scheme=light");
  const edit = page.locator("#annotate-marks").getByRole("button", { name: "Edit props" });
  await edit.click();
  const inspector = page.getByRole("dialog", { name: "Marks" });
  await expect(inspector).toBeFocused();
  const start = (await inspector.boundingBox())!;
  const title = (await inspector.getByRole("heading", { name: "Marks", level: 2 }).boundingBox())!;
  await page.mouse.move(title.x + 8, title.y + 4);
  await page.mouse.down();
  await page.mouse.move(title.x - 192, title.y + 64, { steps: 5 });
  await page.mouse.up();
  const moved = (await inspector.boundingBox())!;
  expect(moved.x).toBeCloseTo(start.x - 200, 0);
  expect(moved.y).toBeCloseTo(start.y + 60, 0);

  // The corner takes the arrow keys, for a keyboard.
  await inspector.getByRole("button", { name: "Resize the inspector" }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Shift+ArrowUp");
  const sized = (await inspector.boundingBox())!;
  expect(sized.width).toBeCloseTo(moved.width - 16, 0);
  expect(sized.height).toBeCloseTo(moved.height - 64, 0);

  await page.reload();
  await edit.click();
  const kept = (await inspector.boundingBox())!;
  expect(kept.x).toBeCloseTo(sized.x, 0);
  expect(kept.y).toBeCloseTo(sized.y, 0);
  expect(kept.width).toBeCloseTo(sized.width, 0);

  const canvas = (await page.locator(".gallery-canvas").boundingBox())!;
  await inspector.getByRole("button", { name: "Move to the other side" }).click();
  expect((await inspector.boundingBox())!.x).toBeCloseTo(canvas.x + 12, 0);

  await page.keyboard.press("Escape");
  await expect(inspector).toBeHidden();
  await expect(edit).toBeFocused();
});

test("the canvas pans with a drag and zooms from its bar or around a pinch", async ({ page }) => {
  await page.goto("/play/gallery/");
  const title = page.getByRole("heading", { name: "Component gallery", level: 1 });
  const canvas = (await page.locator(".gallery-canvas").boundingBox())!;
  const start = (await title.boundingBox())!;
  // The top right holds no frame, so a drag there pans.
  await page.mouse.move(canvas.x + canvas.width - 80, canvas.y + 60);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width - 280, canvas.y + 40, { steps: 5 });
  await page.mouse.up();
  const moved = (await title.boundingBox())!;
  expect(moved.x).toBeCloseTo(start.x - 200, -1);
  expect(moved.y).toBeCloseTo(start.y - 20, -1);

  const card = page.locator("#tabs-tabs .gallery-frames");
  const level = page.getByRole("button", { name: "Reset zoom" });
  const before = (await card.boundingBox())!;
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect(level).toHaveText("80%");
  expect((await card.boundingBox())!.width).toBeCloseTo(before.width * 0.8, 0);
  await level.click();
  await expect(level).toHaveText("100%");
  // In full view, since a box past the canvas's edge still has its coordinates.
  await card.evaluate((node) => node.scrollIntoView({ block: "center", inline: "center" }));

  // A pinch over a frame zooms the canvas, not the page, and the point under the pointer stays put.
  await expect(card.locator(".gallery-frame[data-scheme=light]")).toHaveAttribute("data-ready");
  const box = (await card.boundingBox())!;
  const x = box.x + 40;
  const y = box.y + 40;
  await page.mouse.move(x, y);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -200);
  await page.keyboard.up("Control");
  await expect(level).not.toHaveText("100%");
  const after = (await card.boundingBox())!;
  const scale = after.width / box.width;
  expect(scale).toBeGreaterThan(1.2);
  expect(after.x).toBeCloseTo(x - (x - box.x) * scale, -1);
  expect(after.y).toBeCloseTo(y - (y - box.y) * scale, -1);
});

test("the playground's column links to the gallery", async ({ page }) => {
  await page.goto("/play/");
  await page.locator(".sidebar").getByRole("link", { name: "Component gallery" }).click();
  await expect(page).toHaveURL(/\/play\/gallery\/$/);
  await expect(page.locator(".sidebar .pages a[aria-current=page]")).toHaveText(
    "Component gallery",
  );
});
