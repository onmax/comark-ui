import { createHtmlRenderer } from "@comark/html";
import { expect, test } from "@playwright/test";
import quiz, { components } from "../packages/quiz/src/html.ts";

const render = createHtmlRenderer({ plugins: [quiz()], components });
const question = `::question{#templates}
When does a template's \`getContents\` run for the first time?

- [x] Inside \`generateApp()\`, when \`nuxt dev\` starts
  > \`build()\` calls \`generateApp()\` once at startup, and that call runs every template.
- [ ] When the module calls \`addTemplate()\`
  > \`addTemplate()\` only stores the template. Nothing runs yet.
- [ ] When Vite first imports the file
  > Vite reads the text that is already in \`nuxt.vfs\`.

#explain
A kit helper only records what a module wants. Nuxt core decides when the work runs.
::`;

const themes = {
  light:
    "--background:#fff;--foreground:#0a0a0a;--muted-foreground:#737373;--border:#e5e5e5;--ui-success:oklch(.723 .219 149.579);--ui-error:oklch(.637 .237 25.331)",
  dark: "--background:#0a0a0a;--foreground:#fafafa;--muted-foreground:#a1a1a1;--border:#333;--ui-success:oklch(.792 .209 151.711);--ui-error:oklch(.704 .191 22.216)",
};

for (const appearance of ["light", "dark"] as const) {
  for (const hostTheme of [false, true]) {
    test(`quiz feedback contrast in ${appearance}, host tokens ${hostTheme}`, async ({
      page,
    }, info) => {
      await page.emulateMedia({
        colorScheme: hostTheme ? (appearance === "light" ? "dark" : "light") : appearance,
      });
      await page.setViewportSize({ width: 760, height: 640 });
      await page.setContent(`<!doctype html><html lang="en"><style>
        :root{${hostTheme ? themes[appearance] : ""}}
        body{margin:24px;background:${appearance === "light" ? "#fff" : "#0a0a0a"}}
        p{margin:1rem 0}code{font-size:.875em}
      </style><body>${await render(question)}</body></html>`);

      for (const answer of ["addTemplate", "generateApp"]) {
        const option = page.locator(".cqz-option", { hasText: answer });
        await option.click();
        await page.getByRole("button", { name: "Check", exact: true }).click();
        const correct = answer === "generateApp";
        await expect(page.getByRole("status")).toHaveText(correct ? "Correct" : "Not quite");
        const ratios = await page.locator(".cqz").evaluate((card) => {
          const canvas = document.createElement("canvas").getContext("2d");
          if (!canvas) throw new Error("Canvas is required to measure rendered contrast");
          const luminance = () => {
            const [r = 0, g = 0, b = 0] = canvas.getImageData(0, 0, 1, 1).data;
            const linear = (c: number) =>
              c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4;
            return linear(r) * 0.2126 + linear(g) * 0.7152 + linear(b) * 0.0722;
          };
          return [
            ".cqz-status",
            ".cqz-status .cqz-icon",
            ".cqz-option:not([data-state='idle']) .cqz-rationale",
            ".cqz-option[data-state='correct'] .cqz-yes",
            ".cqz-option[data-state='incorrect'] .cqz-no",
            ".cqz-option[data-state='incorrect'] .cqz-verdict",
          ].flatMap((selector) => {
            const element = card.querySelector(selector);
            if (!element) return [];
            const ancestors: Element[] = [];
            for (let node: Element | null = element; node; node = node.parentElement)
              ancestors.unshift(node);
            canvas.fillStyle = "#fff";
            canvas.fillRect(0, 0, 1, 1);
            for (const ancestor of ancestors) {
              canvas.fillStyle = getComputedStyle(ancestor).backgroundColor;
              canvas.fillRect(0, 0, 1, 1);
            }
            const background = luminance();
            canvas.fillStyle = getComputedStyle(element).color;
            canvas.fillRect(0, 0, 1, 1);
            const foreground = luminance();
            return [
              {
                selector,
                ratio:
                  (Math.max(background, foreground) + 0.05) /
                  (Math.min(background, foreground) + 0.05),
              },
            ];
          });
        });
        await info.attach(`${answer}-contrast`, {
          body: JSON.stringify(ratios, null, 2),
          contentType: "application/json",
        });
        await page.locator(".cqz").screenshot({ path: info.outputPath(`${answer}.png`) });
        for (const { selector, ratio } of ratios) {
          const icon = /cqz-icon|cqz-yes|cqz-no/.test(selector);
          expect.soft(ratio, selector).toBeGreaterThanOrEqual(icon ? 3 : 4.5);
        }
        if (!correct) await page.getByRole("button", { name: "Try again" }).click();
      }

      const gap = await page.locator(".cqz").evaluate((card) => {
        const status = card.querySelector(".cqz-status")?.getBoundingClientRect();
        const explain = card.querySelector(".cqz-explain")?.getBoundingClientRect();
        if (!status || !explain) throw new Error("Expected status and explanation");
        return explain.top - status.bottom;
      });
      expect.soft(gap).toBeGreaterThanOrEqual(4);
      expect.soft(gap).toBeLessThanOrEqual(8);
      await page.setViewportSize({ width: 390, height: 640 });
      const sizes = await page
        .locator(".cqz-choice")
        .evaluateAll((choices) => choices.map((choice) => choice.getBoundingClientRect().height));
      for (const height of sizes) expect.soft(height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
    });
  }
}
