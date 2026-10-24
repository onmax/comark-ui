import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import colors, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [colors()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [colors()] })).meta.issues;
const swatch = (value: string) =>
  `<code class="cco"><span class="cco-swatch" style="--cco:${value}" aria-hidden="true"></span>${value}</code>`;

describe("comark-colors", () => {
  it("puts a swatch before inline code that holds a color, and inlines the styles once", async () => {
    const html = await render("Links use `#3b82f6` and hover to `oklch(0.62 0.19 260 / 80%)`.");
    expect(html.replace(/<style[^>]*>.*?<\/style>/, "")).toContain(
      `Links use ${swatch("#3b82f6")} and hover to ${swatch("oklch(0.62 0.19 260 / 80%)")}.`,
    );
    expect(html.match(/<style data-comark-colors>/g)).toHaveLength(1);
  });

  it("reads hex, rgb(), hsl(), hwb(), lab(), lch(), oklab(), and oklch() colors", async () => {
    for (const value of [
      "#fff",
      "#ffff",
      "#3B82F6",
      "#3b82f680",
      "rgb(59, 130, 246)",
      "rgba(59,130,246,.5)",
      "rgb(59 130 246 / 50%)",
      "hsl(217deg 91% 60%)",
      "hwb(217 23% 4%)",
      "lab(54.6 8.6 -65.7)",
      "lch(54.6 66 97)",
      "oklab(0.62 -0.03 -0.19)",
      "oklch(0.62 0.19 260)",
      "oklch(none 0 0)",
      "rgb(1/**/ 2 3)",
      "rgb(1/**/, 2, 3)",
    ])
      expect(await render(`\`${value}\``), value).toContain('class="cco-swatch"');
  });

  it("leaves code that isn't a color alone, and code blocks too", async () => {
    for (const value of [
      "#ff",
      "#12345",
      "#issue",
      "rgb(1 2)",
      "rgb(1 2 3);background:url(x)",
      'rgb(1 2 3)"',
      "red",
      "var(--blue)",
      "color(display-p3 1 0 0)",
      "`#fff` and more",
      "rgb(1deg 2 3)",
      "rgb(1%, 2, 3%)",
      "rgb(none, none, none)",
      "hsl(1% 2% 3%)",
      "hsl(none, 20%, 30%)",
      "lab(50, 20, 30)",
      "rgb(1\v2 3)",
      "rgb(calc(1 + 2) 0 0)",
    ])
      expect(await render(`\`${value}\``), value).not.toContain("cco-swatch");
    expect(await render("```css\n#3b82f6\n```")).not.toContain("cco");
    expect(await render("Inline `**#fff**` stays code.")).not.toContain("cco");
  });

  it("draws a ::palette as a grid of named tiles", async () => {
    const html = await render(
      "::palette\n- Primary: `#3b82f6`\n- Danger: #ef4444\n- Surface (dark): oklch(0.2 0 0 / 0.5)\n::",
    );
    expect(html).toContain(
      '<ul class="cco-palette"><li><span class="cco-tile" style="--cco:#3b82f6"></span><span class="cco-name">Primary</span><span class="cco-value">#3b82f6</span></li>' +
        '<li><span class="cco-tile" style="--cco:#ef4444"></span><span class="cco-name">Danger</span><span class="cco-value">#ef4444</span></li>' +
        '<li><span class="cco-tile" style="--cco:oklch(0.2 0 0 / 0.5)"></span><span class="cco-name">Surface (dark)</span><span class="cco-value">oklch(0.2 0 0 / 0.5)</span></li></ul>',
    );
    expect(html.match(/<style data-comark-colors>/g)).toHaveLength(1);
    expect(await issues("::palette\n1. Primary: #3b82f6\n::")).toEqual([]);
  });

  it("reports each problem with a palette, naming the block and the fix", async () => {
    expect(
      await issues(
        "::palette\n- Primary: #3b82f6\n- Brand blue\n- Danger: crimson\n::\n\n::palette\nJust text\n::\n\n::palette\nIntro\n\n- A: #fff\n::",
      ),
    ).toEqual([
      '`::palette` 1: "Brand blue" needs a name and a color, such as `- Primary: #3b82f6`.',
      '`::palette` 1: "crimson" for Danger isn\'t a color it can draw. Write a hex color or an rgb(), hsl(), hwb(), lab(), lch(), oklab(), or oklch() color.',
      "`::palette` 2 needs a list of `name: color` lines, such as `- Primary: #3b82f6`.",
      "`::palette` 3 drops everything but its list. Move the rest outside the block.",
    ]);
    // A line it can't read is left out, and an empty palette renders as an empty grid.
    const html = await render("::palette\n- Brand blue\n- Primary: #3b82f6\n::");
    expect(html).toContain(
      '<ul class="cco-palette"><li><span class="cco-tile" style="--cco:#3b82f6">',
    );
  });

  it("names each issue's rule, and reports a prop a palette doesn't have", async () => {
    const { meta } = await parseMarkdown(
      '::palette{title="Pond"}\n- Duck\n- Pigeon: slategray\n::\n\n::palette\n::',
      { plugins: [colors()] },
    );
    expect(meta.issueRules).toEqual({
      "`::palette` 1: `title` isn't a prop of `::palette`, which has none, so it's ignored. Remove it.":
        "comark/colors/unknown-prop",
      '`::palette` 1: "Duck" needs a name and a color, such as `- Primary: #3b82f6`.':
        "comark/colors/unreadable-line",
      '`::palette` 1: "slategray" for Pigeon isn\'t a color it can draw. Write a hex color or an rgb(), hsl(), hwb(), lab(), lch(), oklab(), or oklch() color.':
        "comark/colors/invalid-color",
      "`::palette` 2 needs a list of `name: color` lines, such as `- Primary: #3b82f6`.":
        "comark/colors/missing-list",
    });
  });

  it("keeps the issues other plugins reported", async () => {
    const earlier = {
      name: "earlier",
      post(state: { tree: { meta: { issues?: string[] } } }) {
        state.tree.meta.issues = ["An earlier issue."];
      },
    };
    const { meta } = await parseMarkdown("::palette\n::", { plugins: [earlier, colors()] });
    expect(meta.issues).toEqual([
      "An earlier issue.",
      "`::palette` 1 needs a list of `name: color` lines, such as `- Primary: #3b82f6`.",
    ]);
  });
});
