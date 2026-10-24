import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import fields, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [fields()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [fields()] })).meta.issues;
const body = (html: string) =>
  html.replace(/<style[^>]*>.*?<\/style>/gs, "").replace(/>\s+</g, "><");

describe("comark-fields", () => {
  it("renders a group of fields with name, type, required, and default, and inlines the styles once", async () => {
    const html = await render(
      '::field-group\n:::field{name="level" type="string" default="3"}\nThe heading level.\n:::\n\n:::field{name="items" type="Item[]" required}\nThe items.\n:::\n::',
    );
    expect(body(html)).toBe(
      '<div class="cfl-group">' +
        '<div class="cfl"><div class="cfl-head"><code class="cfl-name">level</code><span class="cfl-type">string</span><span class="cfl-default">Default: <code>3</code></span></div><div class="cfl-body">The heading level.</div></div>' +
        '<div class="cfl"><div class="cfl-head"><code class="cfl-name">items</code><span class="cfl-type">Item[]</span><span class="cfl-required">required</span></div><div class="cfl-body">The items.</div></div>' +
        "</div>",
    );
    expect(html.match(/<style data-comark-fields>/g)).toHaveLength(1);
  });

  it('reads `:required="true"` as Nuxt UI writes it, and a default given as JSON', async () => {
    const html = body(
      await render(
        '::field{name="a" :required="true" :default="0"}\n::\n\n::field{name="b" :required="false" :default=\'{"x":1}\'}\n::',
      ),
    );
    expect(html).toContain(
      '<code class="cfl-name">a</code><span class="cfl-required">required</span><span class="cfl-default">Default: <code>0</code>',
    );
    expect(html).toContain(
      '<code class="cfl-name">b</code><span class="cfl-default">Default: <code>{&quot;x&quot;:1}</code>',
    );
  });

  it("nests `:::field` blocks under an object's field", async () => {
    const html = body(
      await render(
        '::field{name="options" type="object"}\nThe options.\n\n:::field{name="sync" type="string"}\n:::\n::',
      ),
    );
    expect(html).toBe(
      '<div class="cfl"><div class="cfl-head"><code class="cfl-name">options</code><span class="cfl-type">object</span></div><div class="cfl-body"><p>The options.</p>' +
        '<div class="cfl"><div class="cfl-head"><code class="cfl-name">sync</code><span class="cfl-type">string</span></div><div class="cfl-body"></div></div></div></div>',
    );
  });

  it("keeps a parent's description before nested properties", async () => {
    const html = body(
      await render(
        '::field{name="options" type="object" description="The available options."}\n:::field{name="sync" type="string"}\n:::\n::',
      ),
    );
    expect(html).toContain(
      '<div class="cfl-body"><p>The available options.</p><div class="cfl"><div class="cfl-head"><code class="cfl-name">sync</code>',
    );
  });

  it("shows `description` when a field has no content, and escapes what it shows", async () => {
    const html = body(await render('::field{name="<x>" description="From a prop."}\n::'));
    expect(html).toContain('<code class="cfl-name">&lt;x&gt;</code>');
    expect(html).toContain('<div class="cfl-body"><p>From a prop.</p></div>');
  });

  it("reports a field without a name", async () => {
    expect(await issues('::field{name="a"}\n::\n\n::field{type="string"}\nText.\n::')).toEqual([
      '`::field` 2 (a string) has no `name`, so readers can\'t tell what it describes. Write `::field{name="..."}`.',
    ]);
  });

  it("names each issue's rule, and reports props it doesn't use", async () => {
    const { meta } = await parseMarkdown(
      '::field{type="string"}\n::\n\n::field{name="pond" typ="string" description="Where ducks live."}\nThe pond to feed.\n::',
      { plugins: [fields()] },
    );
    expect(meta.issueRules).toEqual({
      '`::field` 1 (a string) has no `name`, so readers can\'t tell what it describes. Write `::field{name="..."}`.':
        "comark/fields/missing-name",
      "`::field` 2 (`pond`): `typ` isn't a prop of `::field`, so it's ignored. Use `name`, `type`, `required`, `default`, or `description`.":
        "comark/fields/unknown-prop",
      "`::field` 2 (`pond`) has content, so its `description` prop is ignored. Write the description as the field's first paragraph instead.":
        "comark/fields/description-ignored",
    });
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown("::field\n::", { plugins: [before(), fields()] });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });
});
