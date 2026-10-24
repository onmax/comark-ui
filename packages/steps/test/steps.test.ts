import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import steps, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [steps()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [steps()] })).meta.issues;
const body = (html: string) => html.replace(/<style[^>]*>.*?<\/style>/gs, "");

describe("comark-steps", () => {
  it("makes a step of each heading and the content after it, and inlines the styles once", async () => {
    const html = await render(
      "::steps\n### Install\nRun this.\n\n```sh\npnpm add x\n```\n\n### Configure {#setup}\nEdit the file.\n::\n\n::steps\n### Again\n::",
    );
    expect(body(html)).toContain(
      '<ol class="cs"><li class="cs-step"><h3 id="install">Install</h3><p>Run this.</p>',
    );
    expect(body(html)).toContain('<li class="cs-step"><h3 id="setup">Configure</h3>');
    expect(html.match(/<style data-comark-steps>/g)).toHaveLength(1);
    expect(html).toContain("counter-increment:cs-step");
  });

  it("starts steps at the `level` heading and keeps the others inside them", async () => {
    const html = body(
      await render('::steps{level="2"}\n## One\n### Detail\nText.\n\n## Two\nMore.\n::'),
    );
    expect(html.match(/<li class="cs-step">/g)).toHaveLength(2);
    expect(html).toContain('<h3 id="detail">Detail</h3>');
    expect(
      await issues('::steps{level="2"}\n## One\n::\n\n::steps{level="7"}\n### One\n::'),
    ).toEqual([
      '`::steps` 2: `level` must be 2 to 6, the level of the headings that start each step. Write `level="3"` for `###` headings.',
    ]);
  });

  it("makes a step of each item of a numbered list, from its `start`", async () => {
    const html = body(await render("::steps\n3. Clone\n4. Install\n::"));
    expect(html).toContain(
      '<ol class="cs" start="3" style="counter-reset:cs-step 2"><li class="cs-step">Clone</li>',
    );
    expect(body(await render("::steps\n1. Clone\n::"))).toContain('<ol class="cs"><li');
  });

  it("numbers each step for a renderer of its own", async () => {
    const { nodes } = await parseMarkdown("::steps\n5. A\n6. B\n::", { plugins: [steps()] });
    expect(nodes).toEqual([
      ["steps", { start: "5" }, ["step", { index: "5" }, "A"], ["step", { index: "6" }, "B"]],
    ]);
  });

  it("renders content before the first heading above the steps, and reports it", async () => {
    const markdown = "::steps\nYou need Node 22.\n\n### Install\nRun it.\n::";
    expect(body(await render(markdown))).toMatch(/^<p>You need Node 22.<\/p>\s*<ol class="cs">/);
    expect(await issues(markdown)).toEqual([
      '`::steps` 1: the paragraph "You need Node 22." comes before the first `###` heading, so it renders above the steps. Move it under a heading, or out of the block.',
    ]);
  });

  it("renders a block without headings as plain content, and says which level to use", async () => {
    expect(body(await render("::steps\n## Install\nRun it.\n::"))).toBe(
      '<h2 id="install">Install</h2>\n<p>Run it.</p>',
    );
    expect(await issues("::steps\n## Install\n::\n\n::steps\nJust text.\n::")).toEqual([
      '`::steps` 1 has no `###` headings, so it renders as plain content. Its headings are `##`, so write `::steps{level="2"}`.',
      "`::steps` 2 has no `###` headings, so it renders as plain content. Start each step with a `### ` heading, or put one numbered list inside.",
    ]);
  });

  it("keeps a `::steps` inside a step apart", async () => {
    const html = body(await render("::steps\n### Outer\n:::steps\n### Inner\n:::\n\n### Next\n::"));
    expect(html.match(/<ol class="cs">/g)).toHaveLength(2);
    expect(html.match(/<li class="cs-step">/g)).toHaveLength(3);
  });

  it("names each issue's rule in meta.issueRules", async () => {
    const { meta } = await parseMarkdown(
      '::steps{level="h3" start="2"}\nFirst.\n\n### Install\n::\n\n::steps\nJust text.\n::',
      { plugins: [steps()] },
    );
    expect(meta.issues.map((issue: string) => meta.issueRules[issue])).toEqual([
      "comark/steps/unknown-prop",
      "comark/steps/invalid-level",
      "comark/steps/content-before-steps",
      "comark/steps/no-steps",
    ]);
    expect(meta.issues[0]).toBe(
      "`::steps` 1: `start` isn't a prop of `::steps`, so it's ignored. Use `level`, the level of the headings that start each step.",
    );
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown("::steps\nNo steps.\n::", {
      plugins: [before(), steps()],
    });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });
});
