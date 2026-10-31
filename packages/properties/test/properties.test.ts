import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import properties, { components } from "../src/html.ts";

const render = (markdown: string, options = {}) =>
  createHtmlRenderer({ plugins: [properties(options)], components })(markdown).then((html) =>
    html
      .replace(/<style[^>]*>.*?<\/style>/s, "")
      .replace(/>\s+/g, ">")
      .replace(/\s+</g, "<"),
  );
const issues = async (markdown: string, options = {}) =>
  (await parseMarkdown(markdown, { plugins: [properties(options)] })).meta.issues;
const review = [
  "---",
  "title: Palette page",
  "tags: [colors, docs]",
  "author: onmax",
  "status: Ready for review",
  "pr: https://github.com/onmax/comark-ui/pull/111",
  "date: 2026-10-23",
  "---",
  "",
  "Body",
].join("\n");

describe("comark-properties", () => {
  it("shows the chosen keys at the top, in order, and inlines the styles once", async () => {
    const html = await createHtmlRenderer({ plugins: [properties()], components })(review);
    expect(html.match(/<style data-comark-properties>/g)).toHaveLength(1);
    expect(await render(review)).toMatch(
      new RegExp(
        '^<dl class="cfm">' +
          '<div data-key="status" data-kind="status"><dt>Status</dt><dd><span class="cfm-status">Ready for review</span></dd></div>' +
          '<div data-key="pr" data-kind="pr"><dt>PR</dt><dd><a href="https://github.com/onmax/comark-ui/pull/111">onmax/comark-ui#111</a></dd></div>' +
          '<div data-key="author" data-kind="person"><dt>Author</dt><dd>onmax</dd></div>' +
          '<div data-key="date" data-kind="date"><dt>Date</dt><dd><time datetime="2026-10-23">Oct 23, 2026</time></dd></div>' +
          '<div data-key="tags" data-kind="tags"><dt>Tags</dt><dd><span class="cfm-tag">colors</span><span class="cfm-tag">docs</span></dd></div>' +
          "</dl><p>Body</p>",
      ),
    );
    expect(await issues(review)).toEqual([]);
  });

  it("goes where ::properties sits instead", async () => {
    const html = await render(review.replace("Body", "# Palette\n\n::properties\n::\n\nBody"));
    expect(html).toMatch(/^<h1 id="palette">Palette<\/h1><dl class="cfm">/);
    expect(html.match(/class="cfm"/g)).toHaveLength(1);
  });

  it("takes its keys, labels, and placement from the options", async () => {
    const options = { keys: ["owner", "due", "pr"], labels: { due: "Due date" }, top: true };
    const html = await render(
      "---\nowner: maxi\ndue: 2026-11-01\npr: https://gitlab.com/group/project/-/merge_requests/7\n---\n\nBody",
      options,
    );
    expect(html).toContain(
      '<div data-key="owner" data-kind="text"><dt>Owner</dt><dd>maxi</dd></div><div data-key="due" data-kind="date"><dt>Due date</dt><dd><time datetime="2026-11-01">Nov 1, 2026</time></dd>',
    );
    expect(html).toContain(">group/project#7</a>");
    expect(await render(review, { top: false })).not.toContain("cfm");
  });

  it("links other addresses by host and path, and escapes text", async () => {
    const html = await render(
      "---\nstatus: <b>wip</b> & co\npr: https://www.example.com/review/7?x=1\n---\n",
    );
    expect(html).toContain('<dd><span class="cfm-status">&lt;b&gt;wip&lt;/b&gt; & co</span></dd>');
    expect(html).toContain(
      '<a href="https://www.example.com/review/7?x=1">example.com/review/7</a>',
    );
  });

  it("picks each other key's icon from its value", async () => {
    const html = await render(
      "---\nsite: https://example.com\ncount: 3\ndone: true\nlabels: [a]\nwhen: 2026-02-30\n---\n",
      { keys: ["site", "count", "done", "labels", "when"] },
    );
    expect([...html.matchAll(/data-kind="(\w+)"/g)].map((match) => match[1])).toEqual([
      "link",
      "number",
      "boolean",
      "tags",
      "date",
    ]);
  });

  it("shows nothing when the frontmatter has none of the keys", async () => {
    expect(await render("---\ntitle: Only a title\n---\n\nBody")).toBe("<p>Body</p>");
  });

  it("skips empty lists", async () => {
    expect(await render("---\ntags: []\n---\n\nBody")).toBe("<p>Body</p>");
    expect(await issues("---\ntags: []\n---\n\n::properties\n::")).toEqual([
      "`::properties` 1 has nothing to show: the frontmatter has none of `status`, `pr`, `author`, `date`, `tags`. Add one, or remove the block.",
    ]);
  });

  it("reports each problem, naming the key or block and the fix", async () => {
    expect(
      await issues(
        "---\nstatus: {a: 1}\ntags: [[a]]\n---\n\n::properties\nText\n::\n\n::properties\n::",
      ),
    ).toEqual([
      "properties: `status` in the frontmatter is neither text, a number, a link, nor a list of them, so it isn't shown. Write it as one of those.",
      "properties: `tags` in the frontmatter is neither text, a number, a link, nor a list of them, so it isn't shown. Write it as one of those.",
      "`::properties` 1 drops the content inside it. Close the block with `::` on the line after it, and write text outside it.",
      "`::properties` 1 has nothing to show: the frontmatter has none of `status`, `pr`, `author`, `date`, `tags`. Add one, or remove the block.",
      "`::properties` 2 has nothing to show: the frontmatter has none of `status`, `pr`, `author`, `date`, `tags`. Add one, or remove the block.",
    ]);
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parseMarkdown(
      '---\nstatus: {a: 1}\n---\n\n::properties{keys="status"}\nText\n::',
      { plugins: [properties()] },
    );
    expect(meta.issueRules).toEqual({
      "properties: `status` in the frontmatter is neither text, a number, a link, nor a list of them, so it isn't shown. Write it as one of those.":
        "comark/properties/invalid-value",
      "`::properties` 1 drops the content inside it. Close the block with `::` on the line after it, and write text outside it.":
        "comark/properties/content-dropped",
      "`::properties` 1: `keys` isn't a prop of `::properties`, so it's ignored. Choose the keys with the plugin's `keys` option.":
        "comark/properties/unknown-prop",
      "`::properties` 1 has nothing to show: the frontmatter has none of `status`, `pr`, `author`, `date`, `tags`. Add one, or remove the block.":
        "comark/properties/nothing-to-show",
    });
  });

  it("keeps the issues other plugins reported", async () => {
    const earlier = {
      name: "earlier",
      post(state: { tree: { meta: { issues?: string[] } } }) {
        state.tree.meta.issues = ["An earlier issue."];
      },
    };
    const { meta } = await parseMarkdown("::properties\n::", { plugins: [earlier, properties()] });
    expect(meta.issues[0]).toBe("An earlier issue.");
    expect(meta.issues).toHaveLength(2);
  });
});
