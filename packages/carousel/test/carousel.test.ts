import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import zoom, { components as zoomComponents } from "comark-zoom/html";
import { describe, expect, it } from "vite-plus/test";
import carousel, { components } from "../src/html.ts";

const render = (markdown: string) =>
  createHtmlRenderer({
    plugins: [carousel(), zoom()],
    components: { ...components, ...zoomComponents },
  })(markdown);
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [carousel()] })).meta.issues;

describe("comark-carousel", () => {
  it("makes every block a zoomable slide, with arrows and a counter", async () => {
    const html = await render(
      '::carousel{title="Tour"}\n![One](a.png)\n\n```ts\nconst two = 2\n```\n\n> Three\n::',
    );
    expect(html).toContain(
      '<div class="cc" data-zoom-gallery role="region" aria-roledescription="carousel" aria-label="Tour">',
    );
    expect(html.match(/class="cc-slide"/g)).toHaveLength(3);
    expect(html).toContain(
      '<div class="cc-slide" role="group" aria-roledescription="slide" aria-label="2 of 3" data-zoom tabindex="0"',
    );
    expect(html).toContain('<span class="cc-count" aria-live="polite">1 / 3</span>');
    // Not `disabled`, which would drop the focus of a reader who pages back to the start with the button.
    expect(html).toContain(
      'data-carousel-step="-1" aria-label="Previous slide" aria-disabled="true"',
    );
    // One zoom script and one carousel script, even with an image that zooms on its own.
    expect(html.match(/<script>/g)).toHaveLength(2);
  });

  it("inlines styles a site can theme with --cc-* variables, with today's look as the fallback", async () => {
    const style = /<style data-comark-carousel>(.*?)<\/style>/s.exec(
      await render("::carousel\nOne\n\nTwo\n::"),
    )?.[1];
    for (const variable of [
      "gap:var(--cc-gap,1rem)",
      "padding:var(--cc-padding,1rem)",
      "background:var(--cc-surface,color-mix(",
      "width:var(--cc-button-size,2rem)",
    ])
      expect(style).toContain(variable);
  });

  it("keeps explicit slides and their titles", async () => {
    const html = await render(
      '::carousel\n:::slide{title="First"}\nOne\n\nStill one\n:::\n\n:::slide\nTwo\n:::\n::',
    );
    expect(html.match(/class="cc-slide"/g)).toHaveLength(2);
    expect(html).toContain(
      'aria-label="1 of 2" data-zoom tabindex="0" data-zoom-title="First"><p>One</p>',
    );
    expect(html).toContain("<p>Still one</p>");
  });

  it("names a zoomed slide without a title or an image after the carousel", async () => {
    const html = await render(
      '::carousel{title="Setup"}\n:::slide{title="Install"}\nOne\n:::\n\n:::slide\nTwo\n:::\n\n:::slide\n![Three](c.png)\n:::\n::',
    );
    expect(html).toContain('aria-label="1 of 3" data-zoom tabindex="0" data-zoom-title="Install">');
    expect(html).toContain('aria-label="2 of 3" data-zoom tabindex="0" data-zoom-title="Setup">');
    // An image names its zoomed view with its alt text.
    expect(html).toContain('aria-label="3 of 3" data-zoom tabindex="0">');
    expect(await render("::carousel\nOne\n\nTwo\n::")).not.toContain('data-zoom-title="');
  });

  it("shows several columns, and marks slides that all fit so wide pages hide the controls", async () => {
    const html = await render("::carousel{columns=2}\nOne\n\nTwo\n::");
    expect(html).toContain(
      '<div class="cc" data-carousel-columns="2" data-carousel-fits data-zoom-gallery',
    );
    expect(html).toContain('<div class="cc-controls">');
    expect(await render("::carousel\nOnly one\n::")).not.toContain('<div class="cc-controls">');
  });

  it("can turn zoom off, with a plain or a bound prop", async () => {
    for (const props of ["zoom=false", ':zoom="false"']) {
      const html = await render(`::carousel{${props}}\nOne\n\nTwo\n::`);
      expect(html).toContain('<div class="cc" role="region"');
      expect(html).toContain(
        '<div class="cc-slide" role="group" aria-roledescription="slide" aria-label="2 of 2">',
      );
      expect(html.match(/<script>/g)).toHaveLength(1);
    }
    expect(await render('::carousel{:columns="2"}\nOne\n\nTwo\n::')).toContain(
      'data-carousel-columns="2"',
    );
  });

  it("lifts an image, or a link around one, out of its own paragraph, and leaves inline images in their text", async () => {
    const html = await render(
      "::carousel\n:::slide\nIntro\n\n![Shot](a.png)\n\n[![Linked](c.png)](https://example.com)\n:::\n\n:::slide\nBuild ![passing](b.svg) on main\n:::\n::",
    );
    expect(html).toContain(
      '<p>Intro</p><img src="a.png" alt="Shot"><a href="https://example.com">',
    );
    expect(html).toContain('<p>Build <img src="b.svg" alt="passing"> on main</p>');
  });

  it("skips comments instead of making them slides", async () => {
    const html = await render("::carousel\nOne\n\n<!-- a note to the author -->\n\nTwo\n::");
    expect(html.match(/class="cc-slide"/g)).toHaveLength(2);
    expect(html).toContain('<span class="cc-count" aria-live="polite">1 / 2</span>');
  });

  it("reports what it drops or changes in meta.issues, naming the block and the fix", async () => {
    expect(await issues("::carousel\nOne\n\nTwo\n::")).toEqual([]);
    expect(
      await issues(
        '::carousel\nOne\n::\n\n::carousel{title="Tour"}\n:::slide\nOne\n:::\n\nStray text\n\n<!-- fine -->\n::',
      ),
    ).toEqual([
      'carousel 2 ("Tour") drops the paragraph "Stray text" because it sits outside every :::slide; move it into a :::slide.',
    ]);
    expect(await issues("::carousel\n::")).toEqual([
      "carousel 1 has no slides; put blocks or :::slide blocks inside it, or remove it.",
    ]);
    expect(await issues("::carousel{columns=5}\nOne\n\nTwo\n::")).toEqual([
      "carousel 1 has columns=5; use 1, 2, or 3.",
    ]);
    expect(await issues('::carousel{:columns="true"}\nOne\n\nTwo\n::')).toEqual([
      "carousel 1 has columns=true; use 1, 2, or 3.",
    ]);
    expect(await issues('::carousel{:columns="2"}\nOne\n\nTwo\n::')).toEqual([]);
    expect(await issues('::carousel{:zoom="data.off"}\nOne\n\nTwo\n::')).toEqual([
      "carousel 1: `:zoom` reads render-time data, which the slides can't follow; set it in the document or frontmatter.",
    ]);
    expect(
      await issues('---\noff: false\n---\n::carousel{:zoom="frontmatter.off"}\nOne\n\nTwo\n::'),
    ).toEqual([]);
    expect(await issues('::carousel{:title="frontmatter.typo"}\nOne\n\nTwo\n::')).toEqual([
      "carousel 1: `:title` points at frontmatter.typo, which is undefined. Fix the path or set `title` directly.",
    ]);
    expect(await issues(':::slide{title="Lost"}\nOne\n:::')).toEqual([
      ':::slide 1 ("Lost") sits outside a ::carousel, so it renders as plain content; wrap it in a ::carousel or remove the :::slide fence.',
    ]);
  });

  it("names each issue's rule in meta.issueRules", async () => {
    const { meta } = await parseMarkdown(
      '::carousel{cols=2}\n::\n\n::carousel{columns=5}\n:::slide{titel="Ducks"}\nOne\n:::\n\nStray\n::\n\n:::slide\nLost\n:::',
      { plugins: [carousel()] },
    );
    expect(meta.issues.map((issue) => meta.issueRules[issue])).toEqual([
      "comark/carousel/unknown-prop",
      "comark/carousel/empty-carousel",
      "comark/carousel/content-outside-slide",
      "comark/carousel/unknown-prop",
      "comark/carousel/invalid-columns",
      "comark/carousel/slide-outside-carousel",
    ]);
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown("::carousel\n::", { plugins: [before(), carousel()] });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });

  it("renders a slide outside a carousel as plain content", async () => {
    const html = await render(':::slide{title="Lost"}\nOne\n:::');
    expect(html).toMatch(/^<div>\s*One\s*<\/div>/);
    expect(html).not.toContain("cc-slide");
    expect(html).not.toContain("undefined");
  });
});
