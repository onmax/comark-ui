import { expect, test } from "@playwright/test";
import { mermaidBundle } from "../packages/ui/test/mermaid-bundle.ts";

let bundle: string;
test.beforeAll(async () => {
  bundle = await mermaidBundle();
});

const small = "flowchart TD\n A --> B";
const long =
  "flowchart LR\n A[Module] --> B[Templates stored here] --> C[Generate application templates] --> D[Load generated files]";

for (const renderer of ["react", "vue", "svelte"]) {
  test(`${renderer} keeps Mermaid widths and copy controls working on mount and update`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(
      '<main style="width:46rem;margin:auto;--comark-wide-room:calc(100vw - 3rem)"></main>',
    );
    await page.addScriptTag({ content: bundle });
    expect(errors).toEqual([]);
    await page.evaluate(
      ({ renderer, small }) => {
        const app = window as unknown as {
          MermaidTest: {
            diagram: (
              renderer: string,
              target: HTMLElement,
              content: string,
            ) => (next: string) => void;
          };
          updateDiagram: (next: string) => void;
        };
        app.updateDiagram = app.MermaidTest.diagram(
          renderer,
          document.querySelector("main")!,
          small,
        );
      },
      { renderer, small },
    );

    const card = page.locator(".cmm");
    const sizes = () =>
      card.evaluate((card) => {
        const svg = card.querySelector("svg")!;
        return {
          natural: Number(svg.getAttribute("width")),
          svg: svg.getBoundingClientRect().width,
          card: card.getBoundingClientRect().width,
          column: card.parentElement!.getBoundingClientRect().width,
          width: (card as HTMLElement).style.getPropertyValue("--cmm-svg"),
        };
      });
    await expect(card).toHaveAttribute("data-wide", "");
    const initial = await sizes();
    expect(initial.natural).toBeLessThan(28 * 16);
    expect(initial.svg).toBeCloseTo(initial.natural, 0);
    expect(initial.width).toBe(`${Math.ceil(initial.natural)}px`);

    await page.evaluate((next) => {
      (window as unknown as { updateDiagram: (next: string) => void }).updateDiagram(next);
    }, long);
    await expect.poll(async () => (await sizes()).card).toBeGreaterThan(initial.column);
    const updated = await sizes();
    expect(updated.width).toBe(`${Math.ceil(updated.natural)}px`);
    expect(updated.svg).toBeCloseTo(updated.natural, 0);
    await expect(page.locator("style[data-comark-mermaid]")).toHaveCount(1);

    // The blank page has no clipboard; both buttons must offer their fallback after an update.
    await card.getByRole("button", { name: "Copy source" }).click();
    await expect(card.locator(".cmm-markdown")).toHaveText(`\`\`\`mermaid\n${long}\n\`\`\``);
    await card.getByRole("button", { name: "Copy image" }).click();
    await expect(card.getByRole("link", { name: "Open PNG" })).toHaveAttribute("href", /^blob:/);
    expect(errors).toEqual([]);
  });
}
