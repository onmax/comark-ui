import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import shiki from "comark/plugins/shiki";
import { describe, expect, it } from "vite-plus/test";
import magicMove, { components } from "../src/html.ts";

const render = (markdown: string, highlight = false) =>
  createHtmlRenderer({
    plugins: highlight ? [magicMove(), shiki()] : [magicMove()],
    components,
  })(markdown);
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [magicMove()] })).meta.issues;
// Without the inline styles and script, whose source mentions attributes of its own.
const markup = async (markdown: string, highlight = false) =>
  (await render(markdown, highlight)).replace(/<style[^>]*>.*?<\/style><script>.*?<\/script>/s, "");

const fence = "```";
const steps = `::magic-move{title="Refactor"}\n${fence}ts [Start]\nconst x = 1\n${fence}\n\n${fence}ts [Extract]\nconst one = 1\nconst x = one\n${fence}\n::`;

describe("comark-magic-move", () => {
  it("renders each code block as a step under its label, the first one shown", async () => {
    const html = await markup(steps);
    expect(html).toContain(
      '<div class="cmv" role="region" aria-roledescription="code steps" aria-label="Refactor"><div class="cmv-stage">' +
        '<div class="cmv-step" role="group" aria-roledescription="step" aria-label="1 of 2"><div class="cmv-label">Start</div><pre',
    );
    expect(html).toContain(
      '<div class="cmv-step" role="group" aria-roledescription="step" aria-label="2 of 2" data-inactive><div class="cmv-label">Extract</div><pre',
    );
    expect(html).toContain('<span class="cmv-count" aria-live="polite">1 / 2</span>');
    expect(html).toContain(
      'data-magic-move-step="-1" aria-label="Previous step" aria-disabled="true"',
    );
    expect(html).toContain('data-magic-move-step="1" aria-label="Next step">');
    // The label names the step, so the code block doesn't also show it as a file name.
    expect(html).not.toContain("filename");
    expect(await issues(steps)).toEqual([]);
  });

  it("keeps Shiki's highlighting, whichever plugin runs first", async () => {
    const html = await markup(steps, true);
    expect(html.match(/<pre[^>]* class="shiki/g)).toHaveLength(2);
    expect(html).toContain('<div class="cmv-label">Extract</div>');
  });

  it("carries its styles and script once per document", async () => {
    const html = await render(`${steps}\n\n${steps}`);
    expect(html.match(/<style data-comark-magic-move>/g)).toHaveLength(1);
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it("leaves the controls out when there is one step", async () => {
    const html = await markup(`::magic-move\n${fence}ts\nx\n${fence}\n::`);
    expect(html).toContain('aria-label="1 of 1"');
    expect(html).not.toContain("cmv-controls");
  });

  it("reports a block with fewer than two steps, content that isn't code, and unknown props", async () => {
    expect(await issues(`::magic-move\n${fence}ts\nx\n${fence}\n::`)).toEqual([
      "magic-move 1 has one code block, so there's nothing to move between; add a code block for each step, or use a plain code block.",
    ]);
    expect(await issues(`::magic-move{title="Empty"}\n::`)).toEqual([
      `magic-move 1 ("Empty") has no code blocks, so there's nothing to move between; add a code block for each step, or use a plain code block.`,
    ]);
    const mixed = `::magic-move{speed=2}\n${fence}ts\nx\n${fence}\n\nThen **this**.\n\n${fence}ts\ny\n${fence}\n::`;
    expect(await issues(mixed)).toEqual([
      "magic-move 1: `speed` isn't a prop of ::magic-move, so it's ignored. Use `title`.",
      'magic-move 1 drops the paragraph "Then this.": only code blocks go inside, one per step. Move it out of the block.',
    ]);
    expect(await markup(mixed)).not.toContain("this");
  });

  it("adds to the issues other plugins report", async () => {
    const other = defineComarkPlugin(() => ({
      name: "other",
      post(state) {
        state.tree.meta.issues = ["other: a problem."];
      },
    }));
    const document = await parseMarkdown(`::magic-move\n::`, {
      plugins: [other(), magicMove()],
    });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("other: a problem.");
  });
});
