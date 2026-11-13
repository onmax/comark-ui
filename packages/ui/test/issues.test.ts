import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import html, { renderIssues } from "../src/html.ts";
import { ComarkIssues } from "../src/vue.ts";

const parse = (markdown: string) =>
  parseMarkdown(markdown, html({ icon: { fetch: false }, chips: { download: false } }));

describe("renderIssues", () => {
  it("renders a document's problems as an open box, with its styles", async () => {
    const { meta } = await parse("> [!INFO]\n> Ducks.\n\n::question\nWhy?\n::");
    const box = renderIssues(meta);
    expect(box).toMatch(/^<style data-comark-issues>@layer comark\{/);
    expect(box).toContain('<details class="cis" data-comark-frame open><summary>');
    expect(box).toContain(`<span class="cis-title">This document has 3 problems</span>`);
    expect(box).toContain('<p class="cis-hint">Fix them in the Markdown.</p>');
    // Backticks read as code, and a counted block's number as an ordinal.
    expect(box).toContain("<li>The quote marked &quot;[!INFO]&quot; isn't a GitHub callout");
    expect(box).toContain("Use <code>[!NOTE]</code>");
    expect(box).toMatch(/<li><code>::question<\/code> #1 /);
  });

  it("renders nothing for a document without problems", async () => {
    const { meta } = await parse("# Fine");
    expect(renderIssues(meta)).toBe("");
    expect(renderIssues(undefined)).toBe("");
  });

  it("takes the host's title and hint, and escapes the problems", () => {
    const meta = { issues: ["Broken <b>tag</b>", null, { message: "Not text" }] };
    const box = renderIssues(meta, {
      title: (count) => `${count} thing to fix`,
      hint: "",
    });
    expect(box).toContain('<span class="cis-title">1 thing to fix</span>');
    expect(box).not.toContain(`<p class="cis-hint">`);
    expect(box).toContain("<li>Broken &lt;b&gt;tag&lt;/b&gt;</li>");
    expect(renderIssues({ issues: ["One"] })).toContain("This document has a problem");
  });

  it("preserves literal entities in issues and host labels in both renderers", async () => {
    const meta = { issues: ["File `a&amp;b.ts` contains &lt;div&gt; and &#65;."] };
    const options = { title: "Check &amp; fix", hint: "Write &lt;div&gt; literally" };
    const markup = renderIssues(meta, options).replace(/<style[^>]*>.*?<\/style>/, "");
    expect(markup).toContain("<code>a&amp;amp;b.ts</code>");
    expect(markup).toContain("contains &amp;lt;div&amp;gt; and &amp;#65;.");
    expect(markup).toContain('class="cis-title">Check &amp;amp; fix</span>');
    expect(markup).toContain('class="cis-hint">Write &amp;lt;div&amp;gt; literally</p>');
    const vue = await renderToString(
      createSSRApp({ render: () => h(ComarkIssues, { meta, ...options }) }),
    );
    expect(vue.replace(' open=""', " open")).toBe(markup);
  });

  it("draws the same box in Vue", async () => {
    const meta = { issues: ["`::chart` 2 has no table."] };
    const vue = await renderToString(createSSRApp({ render: () => h(ComarkIssues, { meta }) }));
    const markup = renderIssues(meta).replace(/<style[^>]*>.*?<\/style>/, "");
    expect(vue.replace(' open=""', " open")).toBe(markup);
    const empty = await renderToString(
      createSSRApp({ render: () => h(ComarkIssues, { meta: {} }) }),
    );
    expect(empty).toBe("<!---->");
  });
});
