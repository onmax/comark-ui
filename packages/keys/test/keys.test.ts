import { createHtmlRenderer } from "@comark/html";
import { createMarkdownParser, parseMarkdown, type ParserOptions } from "comark";
import { describe, expect, it } from "vite-plus/test";
import keys, { type KeysOptions } from "../src/index.ts";

// The renderer indents blocks; the tests compare the markup alone.
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const render = async (markdown: string, options: KeysOptions = {}, parser: ParserOptions = {}) =>
  flat(await createHtmlRenderer({ ...parser, plugins: [keys(options)] })(markdown));
const plus = "<span>+</span>";

describe("comark-keys", () => {
  it("renders each key as a kbd, joined by +, in a .ckb span", async () => {
    expect(await render("Press ++ctrl+shift+k++ to search.")).toBe(
      '<p>Press <span class="ckb"><kbd class="ckb-control">Ctrl</kbd>' +
        plus +
        '<kbd class="ckb-shift">Shift</kbd>' +
        plus +
        '<kbd class="ckb-k">K</kbd></span> to search.</p>',
    );
  });

  it("reads pymdownx.keys' aliases, in any case", async () => {
    expect(await render("++Cmd+opt+esc++ ++pg-dn++ ++up++ ++F5++ ++del++")).toBe(
      '<p><span class="ckb"><kbd class="ckb-command">Cmd</kbd>' +
        plus +
        '<kbd class="ckb-option">Option</kbd>' +
        plus +
        '<kbd class="ckb-escape">Esc</kbd></span> ' +
        '<span class="ckb"><kbd class="ckb-page-down">Page Down</kbd></span> ' +
        '<span class="ckb"><kbd class="ckb-arrow-up">Up</kbd></span> ' +
        '<span class="ckb"><kbd class="ckb-f5">F5</kbd></span> ' +
        '<span class="ckb"><kbd class="ckb-delete">Del</kbd></span></p>',
    );
  });

  it("shows a quoted key's text, with its escapes", async () => {
    expect(await render('++ctrl+"Fire \\"all\\""++ and ++\'Any Key\'++')).toBe(
      '<p><span class="ckb"><kbd class="ckb-control">Ctrl</kbd>' +
        plus +
        '<kbd>Fire "all"</kbd></span> and <span class="ckb"><kbd>Any Key</kbd></span></p>',
    );
  });

  it("leaves C++, spaced pluses, unknown keys, and comark-critic's {++ alone", async () => {
    expect(
      await render(
        "C++ and a++ b++, ++ctrl+nope++, ++constructor++, ++toString++, ++ ctrl ++",
        {},
        {},
      ),
    ).toBe("<p>C++ and a++ b++, ++ctrl+nope++, ++constructor++, ++toString++, ++ ctrl ++</p>");
    // Without comark-critic, Comark's attributes rule takes `{++a++}`, so this checks the rule without it.
    expect(await render("{++a++}", {}, { registerDefaultPlugins: false })).toBe("<p>{++a++}</p>");
    expect(await render("`++a++` and \\+\\+a\\+\\+")).toBe("<p><code>++a++</code> and ++a++</p>");
  });

  it("takes a separator and more keys", async () => {
    expect(
      await render("++hyper+ctrl++", { separator: "", keys: { Hyper: "✦", control: "Control" } }),
    ).toBe(
      '<p><span class="ckb"><kbd class="ckb-hyper">✦</kbd><kbd class="ckb-control">Control</kbd></span></p>',
    );
  });

  it("renders inside emphasis and without Comark's default plugins", async () => {
    expect(await render("**++esc++**", {}, { registerDefaultPlugins: false })).toBe(
      '<p><strong><span class="ckb"><kbd class="ckb-escape">Esc</kbd></span></strong></p>',
    );
  });

  it("leaves unfinished keys as text while streaming, and draws them once closed", async () => {
    expect(await render("Press ++ctrl+")).toBe("<p>Press ++ctrl+</p>");
    const parse = createMarkdownParser({ plugins: [keys()] });
    await parse("Press ++ctrl+", { streaming: true });
    const document = await parse("Press ++ctrl+k++", { streaming: true });
    expect(document.nodes).toMatchObject([
      [
        "p",
        {},
        "Press ",
        [
          "span",
          { class: "ckb" },
          ["kbd", { class: "ckb-control" }, "Ctrl"],
          ["span", {}, "+"],
          ["kbd", { class: "ckb-k" }, "K"],
        ],
      ],
    ]);
  });

  it("keeps the AST to span and kbd nodes", async () => {
    const { nodes } = await parseMarkdown("++enter++", { plugins: [keys()] });
    expect(nodes).toEqual([
      ["p", {}, ["span", { class: "ckb" }, ["kbd", { class: "ckb-enter" }, "Enter"]]],
    ]);
  });
});
