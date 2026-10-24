import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import shiki from "comark/plugins/shiki";
import { describe, expect, it } from "vite-plus/test";
import code, { components as codeComponents } from "../../code/src/html.ts";
import notes, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [notes()], components });
const issues = async (markdown: string, plugins = [notes()]) =>
  (await parseMarkdown(markdown, { plugins })).meta.issues;
const fence =
  "```ts\nconst a = 1 // <1>\nconst b = 2 // keep this <2>\n```\n\n1. Why **a**.\n2. Why b.";
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");

describe("comark-code-notes", () => {
  it("draws markers at the ends of lines and links each to its note and back, with the styles once", async () => {
    const html = flat(await render(`${fence}\n\n${fence.replace("Why", "Again")}`));
    const [, uid] = /href="#(cn-[a-z0-9]+)-1"/.exec(html) ?? [];
    expect(html).toContain(
      `<span class="line">const a = 1<a class="cn-marker" href="#${uid}-1" id="${uid}-1-ref" data-note="1" aria-label="Note 1"></a></span>`,
    );
    expect(html).toContain(
      `<span class="line">const b = 2 // keep this<a class="cn-marker" href="#${uid}-2"`,
    );
    expect(html).toContain(
      `<ol class="cn-notes"><li id="${uid}-1"><a class="cn-marker" href="#${uid}-1-ref" data-note="1" aria-label="Back to marker 1"></a><div>Why <strong>a</strong>.</div></li>`,
    );
    expect(html.match(/<style data-comark-code-notes>/g)).toHaveLength(1);
    // Two fences on one page get their own ids.
    expect(new Set(html.match(/id="cn-[a-z0-9]+-1"/g)).size).toBe(2);
  });

  it("reads #, --, ;, /* */, and <!-- --> comments, and several markers on a line", async () => {
    const markdown =
      "```py\nx = 1  # <1>\ny = 2 # <2> <3>\n-- <1>\n; <2>\n/* <3> */\n<!-- <1> -->\n```\n\n1. One\n2. Two\n3. Three";
    const html = flat(await render(markdown));
    expect(html).toContain('<span class="line">x = 1<a class="cn-marker"');
    expect(html.match(/data-note="3" aria-label="Note 3"/g)).toHaveLength(2);
    expect(html).not.toContain("&lt;1&gt;");
    expect(await issues(markdown)).toEqual([]);
  });

  it("extracts markers from inline block comments", async () => {
    const markdown =
      "```ts\nconst a = 1 /* <1> */\nconst b = 2 /* retry <2> */\n```\n\n1. One\n2. Two";
    const html = flat(await render(markdown));
    expect(html).toContain('<span class="line">const a = 1');
    expect(html).toContain("const b = 2 /* retry */");
    expect(html).not.toContain("&lt;1&gt;");
    expect(await issues(markdown)).toEqual([]);
  });

  it("matches an annotated fence by its position when code repeats", async () => {
    const markdown =
      "```ts\nconst value = 1\n```\n\n```ts\nconst value = 1 // <1>\n```\n\n1. The value.";
    const html = flat(await render(markdown));
    expect(html).toContain('const value = 1<a class="cn-marker"');
    expect(html).toContain('class="cn-notes"');
  });

  it("works on Shiki's lines when it runs first, and inside comark-code's block", async () => {
    const html = flat(
      await createHtmlRenderer({
        plugins: [shiki(), code(), notes()],
        components: { ...codeComponents, ...components },
      })(fence),
    );
    expect(html).toContain('<div class="ck">');
    expect(html).toMatch(
      /<span class="line"[^>]*>(?:<span[^>]*>[^<]*<\/span>)+<a class="cn-marker"/,
    );
    expect(html).not.toContain("&lt;1&gt;");
  });

  it("reports Shiki after it, and still draws the markers", async () => {
    const value = await parseMarkdown(fence, { plugins: [notes(), shiki()] });
    expect(value.meta.issues).toEqual([
      "Code notes: `shiki` comes after `comark-code-notes` in `plugins`, so the annotated code isn't highlighted. Put the code notes plugin after `shiki`.",
    ]);
    expect(JSON.stringify(value.nodes)).toContain('"cn-marker"');
  });

  it("leaves a fence with no list after it as code, and reports it", async () => {
    const html = await render("```ts\nconst a = 1 // <1>\n```\n\nText.");
    expect(html).toContain("const a = 1 // &lt;1&gt;");
    expect(await issues("```ts\nconst a = 1 // <1>\n```\n\nText.")).toEqual([
      "The ```ts fence 1 has markers like `<1>` but no numbered list right after it, so they stay in the code. Write the notes as a numbered list right after the fence.",
    ]);
  });

  it("reports markers without notes and notes without markers", async () => {
    expect(
      await issues("```ts\nconst a = 1 // <1>\nconst b = 2 // <3>\n```\n\n1. One\n2. Two"),
    ).toEqual([
      "The ```ts fence 1: marker <3> has no note, since the list after it has 2 items. Add its note, or remove the marker.",
      "The ```ts fence 1: note 2 has no <2> marker in the code. Add `// <2>` at the end of its line, in the language's comment.",
    ]);
    // A marker with no note links nowhere, so it isn't a link.
    expect(
      flat(await render("```ts\nconst a = 1 // <1>\nconst b = 2 // <3>\n```\n\n1. One")),
    ).toContain('const b = 2<span class="cn-marker" data-note="3"></span>');
  });

  it("names each issue's rule", async () => {
    const { meta } = await parseMarkdown(
      "```ts\nconst a = 1 // <1>\nconst b = 2 // <3>\n```\n\n1. One\n2. Two\n\n```py\nx = 1  # <1>\n```\n\nText.",
      { plugins: [notes()] },
    );
    expect(meta.issueRules).toEqual({
      "The ```ts fence 1: marker <3> has no note, since the list after it has 2 items. Add its note, or remove the marker.":
        "comark/code-notes/marker-without-note",
      "The ```ts fence 1: note 2 has no <2> marker in the code. Add `// <2>` at the end of its line, in the language's comment.":
        "comark/code-notes/note-without-marker",
      "The ```py fence 2 has markers like `<1>` but no numbered list right after it, so they stay in the code. Write the notes as a numbered list right after the fence.":
        "comark/code-notes/missing-notes",
    });
  });

  it("leaves Markdown fences alone, since their markers belong to the fences inside them", async () => {
    const markdown = "````md\n```ts\nconst a = 1 // <1>\n```\n````\n\n1. A list.";
    expect(await issues(markdown)).toEqual([]);
    expect(await render(markdown)).toContain("// &lt;1&gt;");
  });

  it("leaves code without markers alone", async () => {
    const html = await render("```ts\nconst a = 1\n```\n\n1. A list.");
    expect(html).not.toContain("cn-");
    expect(html).toContain("<ol>");
  });
});
