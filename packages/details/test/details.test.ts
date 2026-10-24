import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { createIcons, type IconCollection } from "comark-icon";
import { describe, expect, it } from "vite-plus/test";
import details, { components } from "../src/html.ts";

const lucide: IconCollection = {
  prefix: "lucide",
  icons: { apple: { body: '<path stroke="currentColor" d="M1 1"/>' } },
};
const plugin = () => details({ iconResolver: createIcons({ collections: { lucide } }) });
const render = createHtmlRenderer({ plugins: [plugin()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [plugin()] })).meta.issues;
const body = (html: string) =>
  html.replace(/<style[^>]*>.*?<\/style>/gs, "").replace(/>\s+</g, "><");

describe("comark-details", () => {
  it("renders `::details` with its summary as a real `<summary>`, and inlines the styles once", async () => {
    const html = await render(
      '::details{summary="Why pnpm?"}\nIt saves disk.\n::\n\n::details{open}\n#summary\nWhy **this**?\n\n#default\nBecause.\n::',
    );
    expect(body(html)).toBe(
      '<details class="cdt" data-variant="details"><summary class="cdt-summary"><span>Why pnpm?</span></summary>It saves disk.</details>' +
        '<details class="cdt" data-variant="details" open><summary class="cdt-summary"><span>Why <strong>this</strong>?</span></summary>Because.</details>',
    );
    expect(html.match(/<style data-comark-details>/g)).toHaveLength(1);
    expect(html).not.toContain("<template");
  });

  it("leaves raw `<details>` HTML alone", async () => {
    const markdown = "<details>\n<summary>Raw</summary>\n\nBody\n</details>";
    expect(body(await render(markdown))).toBe(
      "<details><summary>Raw</summary><p>Body</p></details>",
    );
    expect(await issues(markdown)).toEqual([]);
  });

  it("reports a `::details` without a summary", async () => {
    expect(body(await render("::details\nText.\n::"))).toContain("<span>Details</span>");
    expect(await issues("::details\nText.\n::")).toEqual([
      '`::details` 1 has no summary, so it shows "Details". Write `::details{summary="..."}`, or a `#summary` slot.',
    ]);
  });

  it("renders an accordion of native details, open by Nuxt's `defaultValue`", async () => {
    const html = body(
      await render(
        '::accordion{:defaultValue=\'["1"]\'}\n:::accordion-item{label="Install" icon="lucide:apple"}\nRun it.\n:::\n\n:::accordion-item{label="Use" description="Call it."}\n:::\n::',
      ),
    );
    expect(html).toContain(
      '<div class="cdt-accordion"><details class="cdt" data-variant="item"><summary class="cdt-summary"><span class="ci" data-mask aria-hidden="true" style=',
    );
    expect(html).toContain(
      '<details class="cdt" data-variant="item" open><summary class="cdt-summary"><span>Use</span></summary>Call it.</details></div>',
    );
  });

  it("names the items of a single accordion alike, apart from other accordions and documents", async () => {
    const markdown =
      '::accordion{type="single" defaultValue="0"}\n:::accordion-item{label="A"}\nA\n:::\n\n:::accordion-item{label="B"}\nB\n:::\n::\n\n::accordion{type="single"}\n:::accordion-item{label="C"}\nC\n:::\n::';
    const html = await render(markdown);
    const names = [...html.matchAll(/ name="([^"]+)"/g)].map(([, name]) => name);
    expect(names).toHaveLength(3);
    expect(names[0]).toBe(names[1]);
    expect(names[2]).not.toBe(names[0]);
    expect(html).toMatch(/name="[^"]+" open><summary class="cdt-summary"><span>A</);
    expect(await render(markdown)).toBe(html);
    const other = await render(`${markdown}\n\nMore.`);
    expect(other).not.toContain(` name="${names[0]}"`);
    expect(await render('::accordion\n:::accordion-item{label="A"}\nA\n:::\n::')).not.toContain(
      " name=",
    );
  });

  it("renders a collapsible that reads Show and Hide from its props", async () => {
    const html = body(
      await render(
        '::collapsible{name="options" openText="Open"}\n- `a`\n::\n\n::collapsible\nText.\n::',
      ),
    );
    expect(html).toContain(
      '<details class="cdt" data-variant="collapsible"><summary class="cdt-summary"><span><span class="cdt-toggle" data-show="Open " data-hide="Hide "></span>options</span></summary><ul>',
    );
    expect(html).toContain('data-show="Show " data-hide="Hide "></span>properties</span>');
  });

  it("reports items, positions, and content an accordion can't render", async () => {
    expect(
      await issues(
        '::accordion{type="one" :defaultValue=\'["4"]\'}\nStray text.\n\n:::accordion-item\nA\n:::\n::\n\n::accordion\n::\n\n:::accordion-item{label="Loose"}\nText.\n:::\n\n::collapsible\n::\n\n::accordion\n:::accordion-item{label="A" icon="lucide:nope"}\nA\n:::\n::',
      ),
    ).toEqual([
      '`::accordion` 1: `type` is "one". Write `type="single"` to keep one item open, or leave it out.',
      '`::accordion` 1: put each item in `:::accordion-item{label="..."}`. Found the paragraph "Stray text." outside an item, so it doesn\'t render.',
      "`::accordion` 1: `defaultValue` \"4\" isn't an item. Write each item's position from 0, such as `:defaultValue='[\"0\"]'`.",
      '`::accordion` 1, item 1: `label` is required. Write `:::accordion-item{label="..."}`.',
      '`::accordion` 2 has no items. Put `:::accordion-item{label="..."}` blocks inside it, or remove it.',
      '`:::accordion-item` 1 ("Loose") sits outside `::accordion`, so it renders on its own. Wrap it in `::accordion`.',
      "`::collapsible` 1 is empty. Put the content it hides inside it, or remove it.",
      expect.stringMatching(/^`::accordion` 3, item 1, icon "lucide:nope": /),
    ]);
  });

  it("names each issue's rule, and reports props it doesn't read", async () => {
    const { meta } = await parseMarkdown(
      '::details{sumary="Why?"}\nText.\n::\n\n::accordion{type="one"}\n:::accordion-item{label="A" icon="lucide:nope"}\nA\n:::\n::',
      { plugins: [plugin()] },
    );
    expect(Object.values(meta.issueRules)).toEqual([
      "comark/details/unknown-prop",
      "comark/details/missing-summary",
      "comark/details/invalid-type",
      "comark/icon/unknown-icon",
    ]);
    expect(Object.keys(meta.issueRules)[0]).toBe(
      "`::details` 1: `sumary` isn't a prop of `::details`, so it's ignored. Use `summary`, `open`, or `icon`.",
    );
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown("::details\n::", { plugins: [before(), plugin()] });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });
  it("preserves Comark blocks nested in raw HTML subtrees", async () => {
    const markdown = `<details>\n<summary>Raw</summary>\n\n::collapsible{name="nested"}\nHidden\n::\n</details>\n\n<div>\n::details{summary="Nested"}\nBody\n::\n</div>`;
    const html = body(await render(markdown));
    expect(html).toContain("<details><summary>Raw</summary>");
    expect(html).toContain("<div>");
    expect(html).not.toContain('class="cdt"');
    expect(html).not.toContain('data-variant="collapsible"');
    expect(await issues(markdown)).toEqual([]);
  });
});
