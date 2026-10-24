import { createHtmlRenderer } from "@comark/html";
import { createMarkdownParser, parseMarkdown, type ParserOptions } from "comark";
import { describe, expect, it } from "vite-plus/test";
import critic, { type CriticOptions } from "../src/index.ts";

// The renderer indents blocks; the tests compare the markup alone.
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const render = async (markdown: string, options: CriticOptions = {}, parser: ParserOptions = {}) =>
  flat(await createHtmlRenderer({ ...parser, plugins: [critic(options)] })(markdown));
const issues = async (markdown: string, options: CriticOptions = {}) =>
  (await parseMarkdown(markdown, { plugins: [critic(options)] })).meta.issues;

const review =
  "Ship {++on Friday++}{--today--}, {~~after~>before~~} the {==pizza vote==}{>>Ask the duck.<<}.";

describe("comark-critic", () => {
  it("shows every change as native ins, del, and mark with a class, and comments as a span", async () => {
    expect(await render(review)).toBe(
      '<p>Ship <ins class="ccm-ins">on Friday</ins><del class="ccm-del">today</del>, <del class="ccm-del">after</del><ins class="ccm-ins">before</ins> the ' +
        '<mark class="ccm-mark">pizza vote</mark><span class="ccm-comment">Ask the duck.</span>.</p>',
    );
  });

  it("renders the document with the changes accepted, or rejected", async () => {
    expect(await render(review, { mode: "accept" })).toBe(
      "<p>Ship on Friday, before the pizza vote.</p>",
    );
    expect(await render(review, { mode: "reject" })).toBe(
      "<p>Ship today, after the pizza vote.</p>",
    );
  });

  it("parses Markdown inside a mark, and takes attributes after it", async () => {
    expect(await render("Add {++**two** `ducks`++}{.big} now.")).toBe(
      '<p>Add <ins class="ccm-ins big"><strong>two</strong> <code>ducks</code></ins> now.</p>',
    );
    expect(await render("**Count {--the--} pigeons**")).toBe(
      '<p><strong>Count <del class="ccm-del">the</del> pigeons</strong></p>',
    );
  });

  it("leaves a strikethrough's del without a class, so the styles never reach it", async () => {
    expect(await render("~~gone~~ {--removed--}")).toBe(
      '<p><del>gone</del> <del class="ccm-del">removed</del></p>',
    );
  });

  it("closes each of several comments in a paragraph", async () => {
    expect(await render("A{>>one<<} b{>>two<<}.")).toBe(
      '<p>A<span class="ccm-comment">one</span> b<span class="ccm-comment">two</span>.</p>',
    );
  });

  it("keeps delimiter-like text in code spans and escaped text inside marks", async () => {
    expect(await render("{++`++}` ok++}")).toBe(
      '<p><ins class="ccm-ins"><code>++}</code> ok</ins></p>',
    );
    expect(await render("{~~`~>` old~>new~~}")).toBe(
      '<p><del class="ccm-del"><code>~&gt;</code> old</del><ins class="ccm-ins">new</ins></p>',
    );
    expect(await render("{++escaped \\++} text++}")).toBe(
      '<p><ins class="ccm-ins">escaped ++} text</ins></p>',
    );
  });

  it("keeps delimiter-like text inside links, autolinks, and emphasis", async () => {
    expect(await render("{++[x](https://a.test/++}) tail++}")).toBe(
      '<p><ins class="ccm-ins"><a href="https://a.test/++%7D">x</a> tail</ins></p>',
    );
    expect(await render("{++<https://a.test/++}> tail++}")).toBe(
      '<p><ins class="ccm-ins"><a href="https://a.test/++%7D">https://a.test/++}</a> tail</ins></p>',
    );
    expect(await render("{++**x ++} y** tail++}")).toBe(
      '<p><ins class="ccm-ins"><strong>x ++} y</strong> tail</ins></p>',
    );
  });

  it("keeps marks that Comark's attribute rule would drop, and leaves other braces to it", async () => {
    expect(await render("a {++b++} c", {}, { plugins: [] })).toBe(
      '<p>a <ins class="ccm-ins">b</ins> c</p>',
    );
    expect(await render("Paint it {.red}")).toBe('<p class="red">Paint it</p>');
    expect(await render("[Pigeons]{#roof} and `{++code++}`")).toBe(
      '<p><span id="roof">Pigeons</span> and <code>{++code++}</code></p>',
    );
  });

  it("works without Comark's default plugins", async () => {
    expect(await render(review, {}, { registerDefaultPlugins: false })).toBe(await render(review));
    expect(await render("{{ duck }} {.red}", {}, { registerDefaultPlugins: false })).toBe(
      "<p>{{ duck }} {.red}</p>",
    );
  });

  it("reports a mark left open in its paragraph, and keeps its text", async () => {
    expect(await render("Add {++two ducks\n\nto the pond++}")).toBe(
      "<p>Add {++two ducks</p><p>to the pond++}</p>",
    );
    expect(await issues("Add {++two ducks")).toEqual([
      "critic `{++` has no closing `++}` in its paragraph; close it there, or write `\\{++` to keep the text.",
    ]);
    expect(await issues("Add \\{++two ducks")).toBeUndefined();
    expect(await render("Add \\{++two ducks")).toBe("<p>Add {++two ducks</p>");
    expect(await issues("{~~old~~}")).toEqual([
      "critic `{~~old~~}` has no `~>` between the old and the new text; write `{~~old~>new~~}`.",
    ]);
    expect(await issues("Fine.", { mode: "merge" as CriticOptions["mode"] })).toEqual([
      'critic: `mode` must be "view", "accept", or "reject", not "merge"; until then it shows the changes.',
    ]);
  });

  it("names each issue's rule", async () => {
    const { meta } = await parseMarkdown("Add {++two ducks\n\nThe pond has {~~three~~}.", {
      plugins: [critic({ mode: "merge" as CriticOptions["mode"] })],
    });
    expect(meta.issueRules).toEqual({
      'critic: `mode` must be "view", "accept", or "reject", not "merge"; until then it shows the changes.':
        "comark/critic/invalid-mode",
      "critic `{++` has no closing `++}` in its paragraph; close it there, or write `\\{++` to keep the text.":
        "comark/critic/unclosed-mark",
      "critic `{~~three~~}` has no `~>` between the old and the new text; write `{~~old~>new~~}`.":
        "comark/critic/missing-arrow",
    });
  });

  it("keeps a streamed mark's text until it closes, and closes the Markdown inside it", async () => {
    const parse = createMarkdownParser({ plugins: [critic()] });
    const partial = await parse("Add {++two **ducks", { streaming: true });
    expect(partial.nodes).toEqual([
      ["p", { $: { line: 1 } }, "Add {++two ", ["strong", {}, "ducks"]],
    ]);
    const done = await parse("Add {++two **ducks**++}", { streaming: true });
    expect(done.nodes).toEqual([
      [
        "p",
        { $: { line: 1 } },
        "Add ",
        ["ins", { class: "ccm-ins" }, "two ", ["strong", {}, "ducks"]],
      ],
    ]);
    expect(done.meta.issues ?? []).toEqual([]);
  });
});
