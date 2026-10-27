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
  it("renders the steps as tabs over one code block, the first one open", async () => {
    const html = await markup(steps);
    const [, id] = /id="(cmv-[a-z0-9]+-1)-tab-1"/.exec(html) ?? [];
    expect(html).toContain(
      '<div class="cmv"><div class="cmv-list" role="tablist" aria-label="Refactor">' +
        `<button type="button" class="cmv-tab" role="tab" id="${id}-tab-1" aria-controls="${id}-panel-1" aria-selected="true" tabindex="0">Start</button>` +
        `<button type="button" class="cmv-tab" role="tab" id="${id}-tab-2" aria-controls="${id}-panel-2" aria-selected="false" tabindex="-1">Extract</button></div>`,
    );
    expect(html).toContain(
      `<div class="cmv-step" role="tabpanel" id="${id}-panel-1" aria-labelledby="${id}-tab-1" tabindex="0"><div class="cmv-caption">Start</div><pre`,
    );
    expect(html).toContain(
      `<div class="cmv-step" role="tabpanel" id="${id}-panel-2" aria-labelledby="${id}-tab-2" tabindex="0" data-inactive><div class="cmv-caption">Extract</div><pre`,
    );
    // The label names the step, so the code block doesn't also show it as a file name.
    expect(html).not.toContain("filename");
    expect(await issues(steps)).toEqual([]);
  });

  it("names a step without a label by its position, and gives every block its own ids", async () => {
    const plain = `::magic-move\n${fence}ts\nx\n${fence}\n\n${fence}ts\ny\n${fence}\n::`;
    const html = await markup(`${plain}\n\n${plain}`);
    expect(html).toContain('<div class="cmv-list" role="tablist"><button');
    expect(html.match(/>Step 2<\/button>/g)).toHaveLength(2);
    const ids = [...html.matchAll(/id="(cmv-[a-z0-9]+-\d+)-tab-1"/g)].map(([, id]) => id);
    expect(new Set(ids).size).toBe(2);
  });

  it("gives the same block different ids in documents rendered apart for one page", async () => {
    const page = (await markup(`# One\n\n${steps}`)) + (await markup(`# Two\n\n${steps}`));
    const ids = [...page.matchAll(/id="(cmv-[a-z0-9]+-\d+)-tab-1"/g)].map(([, id]) => id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("keeps Shiki's highlighting, whichever plugin runs first", async () => {
    const html = await markup(steps, true);
    expect(html.match(/<pre[^>]* class="shiki/g)).toHaveLength(2);
    expect(html).toContain('<div class="cmv-caption">Extract</div>');
  });

  it("carries its styles and script once per document", async () => {
    const html = await render(`${steps}\n\n${steps}`);
    expect(html.match(/<style data-comark-magic-move>/g)).toHaveLength(1);
    expect(html.match(/<script>/g)).toHaveLength(1);
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
