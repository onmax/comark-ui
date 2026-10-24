import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import { references } from "../src/html.ts";

const render = (markdown: string, repo?: string) =>
  createHtmlRenderer({ plugins: [references({ repo })] })(markdown);

describe("comark-github references", () => {
  it("links mentions, issues in the repo, and issues in another repo", async () => {
    const html = await render(
      "Thanks @onmax, this fixes #12 and onmax/comark#3.",
      "onmax/comark-ui",
    );
    expect(html).toContain('<a href="https://github.com/onmax">@onmax</a>,');
    expect(html).toContain('<a href="https://github.com/onmax/comark-ui/issues/12">#12</a>');
    expect(html).toContain(
      '<a href="https://github.com/onmax/comark/issues/3">onmax/comark#3</a>.',
    );
  });

  it("leaves #123 as text without a repo, and still links the rest", async () => {
    const html = await render("Fixes #12 and onmax/comark#3, by @onmax.");
    expect(html).toContain("Fixes #12 and");
    expect(html).toContain('href="https://github.com/onmax/comark/issues/3"');
    expect(html).toContain('href="https://github.com/onmax"');
  });

  it("leaves emails, npm scopes, code, links, and words with a # alone", async () => {
    const html = await render(
      "Mail me@onmax.dev about `@onmax` and @comark/html, see [#4](https://x.dev) or C#9 and #4a.",
      "onmax/comark-ui",
    );
    expect(html).not.toContain("github.com");
  });

  it("finds references in nested inline content", async () => {
    const html = await render("- **Ask @onmax** about _#7_", "onmax/comark-ui");
    expect(html).toContain('<strong>Ask <a href="https://github.com/onmax">@onmax</a></strong>');
    expect(html).toContain('<em><a href="https://github.com/onmax/comark-ui/issues/7">#7</a></em>');
  });

  it("reports a repo that isn't owner/name, and leaves #123 as text", async () => {
    const { meta } = await parseMarkdown("See #12.", {
      plugins: [references({ repo: "https://github.com/onmax/comark-ui" })],
    });
    expect(meta.issues).toEqual([expect.stringMatching(/^references: `repo` must be owner\/name/)]);
    expect(await render("See #12.", "comark-ui")).not.toContain("<a");
  });
});
