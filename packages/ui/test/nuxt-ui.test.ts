import { createHtmlRenderer } from "@comark/html";
import { describe, expect, it } from "vite-plus/test";
import html from "../src/html.ts";
import { nuxtUiTheme } from "../src/nuxt-ui.ts";

describe("nuxtUiTheme", () => {
  it("rebuilds Nuxt UI's defaults", () => {
    const { css, issues } = nuxtUiTheme();
    expect(issues).toEqual([]);
    expect(css).toContain("--ui-color-primary-500:oklch(72.3% 0.219 149.579)");
    expect(css).toContain("--ui-color-neutral-900:oklch(20.8% 0.042 265.755)");
    expect(css).toContain(":root,.light{--ui-primary:var(--ui-color-primary-500)");
    expect(css).toContain("--ui-bg:#fff");
    expect(css).toContain(".dark{--ui-primary:var(--ui-color-primary-400)");
    expect(css).toContain("--ui-bg:var(--ui-color-neutral-900)");
    expect(css).toContain("@media (prefers-color-scheme:dark){:root:not(.light){");
    expect(css).toContain("--color-blue-500:oklch(62.3% 0.214 259.815)");
  });

  it("reads the app's colors, @theme, and overrides", () => {
    const { css, issues } = nuxtUiTheme({
      colors: { primary: "brand", neutral: "zinc" },
      css: `@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --font-sans: "Public Sans", sans-serif;
  ${[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => `--color-brand-${step}: #${String(step).padStart(3, "0")}000;`).join("\n  ")}
}

/* Overrides */
:root {
  --ui-primary: var(--ui-color-primary-700);
  --ui-radius: 0.5rem;
}
.dark {
  --ui-bg: var(--color-stone-950);
}`,
    });
    expect(issues).toEqual([]);
    expect(css).toContain("--ui-color-primary-500:#500000");
    expect(css).toContain("--ui-color-neutral-200:oklch(92% 0.004 286.32)");
    expect(css).toContain("--ui-color-secondary-500:oklch(62.3% 0.214 259.815)");
    expect(css).toContain('--font-sans:"Public Sans", sans-serif');
    expect(css).toContain("--ui-primary:var(--ui-color-primary-700)");
    expect(css).toContain("--ui-radius:0.5rem");
    expect(css).toContain("--ui-bg:var(--color-stone-950)");
    expect(css).toContain("--color-stone-950:oklch(14.7% 0.004 49.25)");
  });

  it("names a color it can't resolve", () => {
    const { css, issues } = nuxtUiTheme({ colors: { primary: "brand" } });
    expect(issues).toEqual([
      'Nuxt UI color "primary" is "brand", which is neither a Tailwind color nor defined as --color-brand-50 to -950 in the CSS: pass the CSS with its @theme shades, or pick a Tailwind color.',
    ]);
    expect(css).not.toContain("--ui-color-primary-500:");
  });
});

describe("the plugins' styles", () => {
  it("fall back to Nuxt UI's variables", async () => {
    const render = createHtmlRenderer(
      html({ chips: { download: false }, icon: { fetch: false }, diagrams: { draw: false } }),
    );
    const output = await render("![A cat](/cat.png)");
    expect(output).toContain("var(--comark-background,var(--ui-bg,var(--background,#fff)))");
    expect(output).toContain("calc(var(--ui-radius,calc(var(--radius,.625rem)/2))*2)");
  });
});
