import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import badge, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [badge()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [badge()] })).meta.issues;
// The renderer indents blocks that hold inline content; the tests compare the markup alone.
const body = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<");

describe("comark-badge", () => {
  it("renders an inline badge in its color, and inlines the styles once", async () => {
    const html = await render(
      '## useFetch :badge[deprecated]{color="warning"}\n\nSince :badge[v4]{color="info"}.',
    );
    expect(body(html)).toBe(
      '<h2 id="usefetch-deprecated">useFetch<span class="cb" data-color="warning">deprecated</span></h2>' +
        '<p>Since<span class="cb" data-color="info">v4</span>.</p>',
    );
    expect(html.match(/<style data-comark-badge>/g)).toHaveLength(1);
  });

  it("renders Nuxt UI's block badge without its paragraph, in primary", async () => {
    expect(body(await render("::badge\n**v4.0.0**\n::"))).toBe(
      '<span class="cb" data-color="primary"><strong>v4.0.0</strong></span>',
    );
  });

  it("reads every Nuxt UI color", async () => {
    for (const color of ["primary", "secondary", "success", "info", "warning", "error", "neutral"])
      expect(await render(`:badge[x]{color="${color}"}`)).toContain(`data-color="${color}"`);
  });

  it("reports an unknown color and an empty badge", async () => {
    const markdown = ':badge[Beta]{color="purple"} and :badge{color="info"}';
    expect(body(await render(markdown))).toContain(
      '<span class="cb" data-color="primary">Beta</span>',
    );
    expect(await issues(markdown)).toEqual([
      '`:badge` 1 ("Beta"): `color` is "purple", so it shows as primary. Write one of primary, secondary, success, info, warning, error, neutral.',
      "`:badge` 2 is empty. Write its text in brackets: `:badge[New]`.",
    ]);
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parseMarkdown(':badge[Beta]{color="purple" size="sm"} :badge{}', {
      plugins: [badge()],
    });
    expect(meta.issueRules).toEqual({
      "`:badge` 1 (\"Beta\"): `size` isn't a prop of `:badge`, so it's ignored. Use `color`.":
        "comark/badge/unknown-prop",
      '`:badge` 1 ("Beta"): `color` is "purple", so it shows as primary. Write one of primary, secondary, success, info, warning, error, neutral.':
        "comark/badge/invalid-color",
      "`:badge` 2 is empty. Write its text in brackets: `:badge[New]`.": "comark/badge/empty-badge",
    });
  });

  it("drops `{#id .class}`", async () => {
    const html = body(await render(':badge[x]{#x .y color="info"}'));
    expect(html).toBe('<span class="cb" data-color="info">x</span>');
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown(':badge[x]{color="red"}', {
      plugins: [before(), badge()],
    });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });
});
