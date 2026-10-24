import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import toc, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [toc()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [toc()] })).meta.issues;
const nav = async (markdown: string) =>
  /<nav class="cto"[^>]*>(.*?)<\/nav>/s.exec((await render(markdown)).replace(/>\s+</g, "><"))?.[1];
const page = [
  "# Pigeon tracker",
  "::toc\n::",
  "## Install",
  "## Usage *now*",
  "### Options",
  "#### Deep",
  "### Events {#on}",
  "## FAQ",
].join("\n\n");

describe("comark-outline", () => {
  it("lists the h2 and h3 headings as nested links, and inlines the styles once", async () => {
    const html = await render(`${page}\n\n::toc\n::`);
    expect(await nav(page)).toBe(
      '<ul><li><a href="#install">Install</a></li>' +
        '<li><a href="#usage-now">Usage now</a><ul><li><a href="#options">Options</a></li><li><a href="#on">Events</a></li></ul></li>' +
        '<li><a href="#faq">FAQ</a></li></ul>',
    );
    expect(html).toContain('<nav class="cto" aria-label="Contents">');
    expect(html.match(/<style data-comark-outline>/g)).toHaveLength(1);
    expect(html.match(/<nav class="cto"/g)).toHaveLength(2);
    expect(await issues(page)).toEqual([]);
  });

  it("goes down to `depth`, and shows a `title`", async () => {
    const list = await nav(page.replace("::toc", '::toc{depth=4 title="On this page"}'));
    expect(list).toContain('<p class="cto-title">On this page</p>');
    expect(list).toContain(
      '<a href="#options">Options</a><ul><li><a href="#deep">Deep</a></li></ul>',
    );
    expect(await nav(page.replace("::toc", "::toc{depth=2}"))).not.toContain(
      '<ul><li><a href="#options"',
    );
  });

  it("nests a heading under the closest one above it when levels are skipped", async () => {
    expect(await nav("::toc\n::\n\n### Early\n\n## Later\n\n### Child")).toBe(
      '<ul><li><a href="#early">Early</a></li><li><a href="#later">Later</a><ul><li><a href="#child">Child</a></li></ul></li></ul>',
    );
  });

  it("escapes heading text", async () => {
    expect(await nav("::toc\n::\n\n## `<b>` & co")).toContain(">&lt;b&gt; & co</a>");
  });

  it("reports each problem, naming the block and the fix", async () => {
    expect(
      await issues(
        "::toc{depth=7}\n::\n\n::toc\nIntro\n::\n\n# Only a title\n\n::toc{depth=two}\n::",
      ),
    ).toEqual([
      "`::toc` 1: `depth` must be a whole number from 2 to 6, such as `depth=3` for h2 and h3 headings.",
      "`::toc` 2 drops the content inside it. Close the block with `::` on the line after it, and write text outside it.",
      "`::toc` 2 has no headings from h2 to h3 to list. Add `##` headings, or remove the block.",
      "`::toc` 3: `depth` must be a whole number from 2 to 6, such as `depth=3` for h2 and h3 headings.",
    ]);
    expect(await render("::toc\n::")).not.toContain("cto");
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parseMarkdown("::toc{levels=4}\n::\n\n::toc{depth=9}\n::", {
      plugins: [toc()],
    });
    expect(meta.issueRules).toEqual({
      "`::toc` 1: `levels` isn't a prop of `::toc`, so it's ignored. Use `depth` or `title`.":
        "comark/outline/unknown-prop",
      "`::toc` 1 has no headings from h2 to h3 to list. Add `##` headings, or remove the block.":
        "comark/outline/no-headings",
      "`::toc` 2: `depth` must be a whole number from 2 to 6, such as `depth=3` for h2 and h3 headings.":
        "comark/outline/invalid-depth",
    });
  });

  it("keeps the issues other plugins reported", async () => {
    const earlier = {
      name: "earlier",
      post(state: { tree: { meta: { issues?: string[] } } }) {
        state.tree.meta.issues = ["An earlier issue."];
      },
    };
    const { meta } = await parseMarkdown("::toc\n::", { plugins: [earlier, toc()] });
    expect(meta.issues[0]).toBe("An earlier issue.");
    expect(meta.issues).toHaveLength(2);
  });
});
