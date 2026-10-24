import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { createIcons, type IconCollection } from "comark-icon";
import { describe, expect, it } from "vite-plus/test";
import cards, { components } from "../src/html.ts";

const lucide: IconCollection = {
  prefix: "lucide",
  icons: { book: { body: '<path stroke="currentColor" d="M1 1"/>' } },
};
const plugin = () => cards({ iconResolver: createIcons({ collections: { lucide } }) });
const render = createHtmlRenderer({ plugins: [plugin()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [plugin()] })).meta.issues;
const body = (html: string) =>
  html.replace(/<style[^>]*>.*?<\/style>/gs, "").replace(/>\s+</g, "><");

describe("comark-cards", () => {
  it("renders a group of cards, and inlines the styles once", async () => {
    const html = await render(
      '::card-group\n:::card{title="Guides" description="Start here." color="info"}\n:::\n\n:::card{title="API"}\nEvery **option**.\n:::\n::',
    );
    expect(body(html)).toBe(
      '<div class="ccr-group"><div class="ccr" data-color="info"><p class="ccr-title">Guides</p><p>Start here.</p></div>' +
        '<div class="ccr" data-color="primary"><p class="ccr-title">API</p>Every <strong>option</strong>.</div></div>',
    );
    expect(html.match(/<style data-comark-cards>/g)).toHaveLength(1);
  });

  it("covers a link card with its link, and opens web links in a new tab", async () => {
    const html = body(
      await render(
        '::card{title="Docs" to="/guide" icon="lucide:book"}\nRead it.\n::\n\n::card{title="GitHub" to="https://github.com/onmax"}\n::',
      ),
    );
    expect(html).toContain(
      '<div class="ccr" data-color="primary"><a class="ccr-link" href="/guide" aria-label="Docs"></a><span class="ci" data-mask aria-hidden="true" style=',
    );
    expect(html).toContain(
      '<a class="ccr-link" href="https://github.com/onmax" target="_blank" rel="noopener noreferrer" aria-label="GitHub"></a><svg class="ccr-external"',
    );
  });

  it("takes its title from a `#title` slot", async () => {
    const html = body(await render("::card\n#title\nThe `api` route\n\n#default\nBody.\n::"));
    expect(html).toBe(
      '<div class="ccr" data-color="primary"><p class="ccr-title">The <code>api</code> route</p>Body.</div>',
    );
  });

  it("puts each block of `::columns` in a cell, and `:::column` groups blocks", async () => {
    const html = body(
      await render('::columns{cols="3"}\nOne.\n\n:::column\nTwo.\n\nThree.\n:::\n::'),
    );
    expect(html).toBe(
      '<div class="ccr-columns" data-cols="3"><div class="ccr-column"><p>One.</p></div><div class="ccr-column"><p>Two.</p><p>Three.</p></div></div>',
    );
    expect(body(await render("::columns\nA\n::"))).toContain('data-cols="2"');
  });

  it("washes a `soft` or `subtle` card in its color, and keeps an `outline` one plain", async () => {
    const rendered = await render(
      '::card{title="Failing" color="error" variant="soft"}\n::\n\n::card{title="Passing" color="success" variant="subtle"}\n::\n\n::card{title="Plain" variant="outline"}\n::',
    );
    const html = body(rendered);
    expect(html).toBe(
      '<div class="ccr" data-color="error" data-variant="soft"><p class="ccr-title">Failing</p></div>' +
        '<div class="ccr" data-color="success" data-variant="subtle"><p class="ccr-title">Passing</p></div>' +
        '<div class="ccr" data-color="primary"><p class="ccr-title">Plain</p></div>',
    );
    expect(rendered).toContain(
      ".ccr[data-variant='soft']:has(>.ccr-link):hover{border-color:transparent}",
    );
    expect(rendered).toContain(
      ".ccr[data-variant='subtle']:has(>.ccr-link):hover{border-color:color-mix(in srgb,var(--ccr) 30%,var(--_comark-background))}",
    );
    expect(rendered).toContain(
      ".ccr[data-variant='soft'],.ccr[data-variant='subtle']{background:color-mix(in srgb,var(--ccr) 10%,var(--_comark-background))}",
    );
  });

  it("links a card written with `href`, and says to write `to`", async () => {
    const markdown = '::card{title="Docs" href="/guide"}\n::';
    expect(body(await render(markdown))).toContain('<a class="ccr-link" href="/guide"');
    expect(await issues(markdown)).toEqual([
      '`::card` 1 ("Docs"): Nuxt UI links a card with `to`, so it ignores `href`. Write `to="/guide"` instead.',
    ]);
  });

  it("reports an unknown color or variant, a script link, bad columns, and an icon it can't draw", async () => {
    const markdown =
      '::card{title="A" color="pink" variant="ghost"}\n::\n\n::card{to="javascript:alert(1)"}\n::\n\n::columns{cols="9"}\nA\n::\n\n::columns\n::\n\n::card{icon="lucide:nope"}\n::';
    expect(body(await render(markdown))).not.toContain("javascript:");
    expect(await issues(markdown)).toEqual([
      '`::card` 1 ("A"): `color` is "pink", so it shows as primary. Write one of primary, secondary, success, info, warning, error, neutral.',
      '`::card` 1 ("A"): `variant` is "ghost", so it shows as outline. Write one of outline, soft, subtle.',
      "`::card` 2: `to` must be a page or a web address, so it isn't a link.",
      '`::columns` 1: `cols` is "9", so it shows 2 columns. Write a number from 1 to 6.',
      "`::columns` 2 is empty. Put a block inside for each column, or remove it.",
      expect.stringMatching(/^`::card` 3, icon "lucide:nope": /),
    ]);
  });

  it("names each issue's rule in meta.issueRules, with comark-icon's for icons", async () => {
    const { meta } = await parseMarkdown(
      '::card{title="A" color="pink" variant="solid" link="/a"}\n::\n\n::card{href="/b"}\n::\n\n::columns{columns="3"}\nA\n::\n\n::card{icon="lucide:nope"}\n::',
      { plugins: [plugin()] },
    );
    expect(meta.issues.map((issue: string) => meta.issueRules[issue])).toEqual([
      "comark/cards/unknown-prop",
      "comark/cards/invalid-color",
      "comark/cards/invalid-variant",
      "comark/cards/href-instead-of-to",
      "comark/cards/unknown-prop",
      "comark/icon/unknown-icon",
    ]);
    expect(meta.issues[0]).toBe(
      "`::card` 1 (\"A\"): `link` isn't a prop of `::card`, so it's ignored. Use `title`, `description`, `icon`, `to`, `target`, `color`, or `variant`.",
    );
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown("::columns\n::", { plugins: [before(), plugin()] });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });
});
