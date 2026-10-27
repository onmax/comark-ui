import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import sources, { components } from "../src/html.ts";

const render = async (markdown: string) =>
  (await createHtmlRenderer({ plugins: [sources()], components })(markdown))
    .replace(/<style[^>]*>.*?<\/style>/s, "")
    .replace(/\s*\n\s*/g, "");
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [sources()] })).meta.issues;
const list = [
  "::sources",
  "1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)",
  "2. [Pigeon intelligence](https://en.wikipedia.org/wiki/Pigeon_intelligence), on smell",
  "3. [Homing](https://example.com/homing)",
  "::",
].join("\n");

describe("comark-sources", () => {
  it("links each citation to its source, and each source back to its citations", async () => {
    const html = await render(
      `By the sun :cite[1], and by smell :cite[2,3]. Again :cite[1].\n\n${list}`,
    );
    expect(html).toContain(
      'By the sun<sup class="cso-cite">[<a href="#cso-1" id="cso-1-cite-1" title="Magnetoreception">1</a>]</sup>',
    );
    expect(html).toContain(
      '<sup class="cso-cite">[<a href="#cso-2" id="cso-2-cite-1" title="Pigeon intelligence, on smell">2</a>, <a href="#cso-3" id="cso-3-cite-1" title="Homing">3</a>]</sup>',
    );
    expect(html).toContain(
      '<section class="cso" aria-label="Sources"><p class="cso-title">Sources</p><ol><li id="cso-1"><a href="https://en.wikipedia.org/wiki/Magnetoreception">Magnetoreception</a> <a href="#cso-1-cite-1" class="cso-back" aria-label="Back to citation 1">↩1</a> <a href="#cso-1-cite-2" class="cso-back" aria-label="Back to citation 2">↩2</a></li>',
    );
    expect(html).toContain(
      '<li id="cso-3"><a href="https://example.com/homing">Homing</a> <a href="#cso-3-cite-1" class="cso-back" aria-label="Back to citation 1">↩</a></li></ol></section>',
    );
    expect(await issues(`:cite[1] :cite[2] :cite[3]\n\n${list}`)).toEqual([]);
  });

  it("takes a title, and cites a list that comes before the text", async () => {
    const html = await render(
      `${list.replace("::sources", '::sources{title="References"}')}\n\nLater :cite[3].`,
    );
    expect(html).toContain(
      '<section class="cso" aria-label="References"><p class="cso-title">References</p>',
    );
    expect(html).toContain('href="#cso-3" id="cso-3-cite-1"');
  });

  it("inlines the styles and the card's script once", async () => {
    const html = await createHtmlRenderer({ plugins: [sources()], components })(
      `:cite[1]\n\n${list}`,
    );
    expect(html.match(/<style data-comark-sources>/g)).toHaveLength(1);
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it("reports each problem, naming the block and the fix", async () => {
    expect(
      await issues(
        `:cite[4] :cite[x] :cite[]\n\n${list.replace("3. [Homing](https://example.com/homing)", "3. Homing, no link")}\n\n::sources\n1. [Again](https://example.com)\n::`,
      ),
    ).toEqual([
      "`::sources` 1: source 3 has no link. Write it as `[Title](https://...)`.",
      "`::sources` 2: a document has one list of sources, and this is a second. Merge it into the first.",
      "`:cite` 1 cites source 4, but `::sources` lists 3. Fix the number, or add the source.",
      "`:cite` 2 needs source numbers inside it, such as `:cite[2]` or `:cite[1,3]`.",
      "`:cite` 3 needs source numbers inside it, such as `:cite[2]` or `:cite[1,3]`.",
    ]);
    expect(await issues(":cite[1]\n\n::sources\nJust text\n::")).toEqual([
      "`::sources` 1 needs a numbered list of links, such as `1. [Vite](https://vite.dev)`.",
      "`:cite` 1 cites source 1, but the document has no `::sources` list. Add one with the links it cites.",
    ]);
    expect(await render(":cite[2]")).toBe('<sup class="cso-cite">[2]</sup>');
    expect(await issues(":cite[1]\n\n::sources\n- [Vite](https://vite.dev)\n::")).toEqual([
      "`::sources` 1 needs a numbered list of links, such as `1. [Vite](https://vite.dev)`.",
      "`:cite` 1 cites source 1, but the document has no `::sources` list. Add one with the links it cites.",
    ]);
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parseMarkdown(
      ':cite[two] :cite[4]\n\n::sources{titel="Reading"}\n1. [Homing](https://example.com/homing)\n::',
      { plugins: [sources()] },
    );
    expect(meta.issueRules).toEqual({
      "`::sources` 1: `titel` isn't a prop of `::sources`, so it's ignored. Use `title`.":
        "comark/sources/unknown-prop",
      "`:cite` 1 needs source numbers inside it, such as `:cite[2]` or `:cite[1,3]`.":
        "comark/sources/invalid-cite",
      "`:cite` 2 cites source 4, but `::sources` lists 1. Fix the number, or add the source.":
        "comark/sources/unknown-source",
    });
  });

  it("keeps the issues other plugins reported", async () => {
    const earlier = {
      name: "earlier",
      post(state: { tree: { meta: { issues?: string[] } } }) {
        state.tree.meta.issues = ["An earlier issue."];
      },
    };
    const { meta } = await parseMarkdown(":cite[1]", { plugins: [earlier, sources()] });
    expect(meta.issues[0]).toBe("An earlier issue.");
    expect(meta.issues).toHaveLength(2);
  });
});
