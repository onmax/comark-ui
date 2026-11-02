import { describe, expect, it } from "vite-plus/test";
import { comarkHtml, comarkSetup, compare, markedHtml, migrateContent } from "./support/index.ts";

// marked must render the migrated Markdown byte for byte as before, and Comark must read it like marked does.
async function migrated(markdown: string, options: Parameters<typeof migrateContent>[1] = {}) {
  const result = migrateContent(markdown, options);
  expect(markedHtml(result.markdown, options.options)).toBe(markedHtml(markdown, options.options));
  expect(migrateContent(result.markdown, options).markdown).toBe(result.markdown);
  return result;
}

const same = async (markdown: string) => {
  const setup = comarkSetup();
  return compare(markedHtml(markdown), await comarkHtml(markdown, setup));
};

describe("migrateContent", () => {
  it.each([
    ["Set {value} first.", "Set \\{value} first."],
    ["A [bracket] here.", "A \\[bracket\\] here."],
    ["Run :name and ::: info", "Run \\:name and ::: info"],
    ["::: info\nnote\n:::", "\\:\\:\\: info\nnote\n:::"],
    ["~struck~ text", "~~struck~~ text"],
    ["See [ref].\n\n[ref]: https://a.dev\n", "See [ref][].\n\n[ref]: https://a.dev\n"],
    [
      "See [a {b}][].\n\n[a {b}]: https://a.dev\n",
      "See [a \\{b}][a {b}].\n\n[a {b}]: https://a.dev\n",
    ],
  ])("escapes %j so Comark reads it like marked", async (markdown, expected) => {
    const result = await migrated(markdown);
    expect(result.markdown).toBe(expected);
    expect((await same(result.markdown)).differences).toEqual([]);
  });

  it("leaves code, HTML blocks, links, and frontmatter byte for byte", async () => {
    const markdown =
      '---\ntitle: {a}\n---\n\n`{code}` and <span title="{x}">\n\n```js\nconst a = {}\n```\n\n<div>\n[raw]\n</div>\n\n<https://a.dev/{x}> https://b.dev/[y]\n';
    const result = await migrated(markdown);
    expect(result.markdown).toBe(markdown);
  });

  it("escapes text between inline tags, which both read as Markdown", async () => {
    expect((await migrated("a <b>{x}</b>\n")).markdown).toBe("a <b>\\{x}</b>\n");
  });

  it("finds text inside quotes, list items, and table cells", async () => {
    const result = await migrated(
      "> a {b}\n> c [d]\n\n- e {f}\n  g {h}\n\n| i | j{} |\n|---|---|\n| [k] | l |\n",
    );
    expect(result.markdown).toBe(
      "> a \\{b}\n> c \\[d\\]\n\n- e \\{f}\n  g \\{h}\n\n| i | j\\{} |\n|---|---|\n| \\[k\\] | l |\n",
    );
    expect((await same(result.markdown)).differences).toEqual([]);
  });

  it("keeps task list markers", async () => {
    const result = await migrated("- [ ] todo {x}\n- [x] done\n");
    expect(result.markdown).toBe("- [ ] todo \\{x}\n- [x] done\n");
  });

  it("keeps CRLF line endings and lists changes by line", async () => {
    const result = await migrated("one\r\ntwo {a}\r\nthree [b]\r\n");
    expect(result.markdown).toBe("one\r\ntwo \\{a}\r\nthree \\[b\\]\r\n");
    expect([...new Set(result.changes.map((change) => change.line))]).toEqual([2, 3]);
  });

  it("leaves a block marked would read differently and reports its line", () => {
    // A judge that sees every backslash, as an older marked without an escape for `:` would.
    const result = migrateContent("Fine {a}.\n\nNot :fine.\n", {
      render: (markdown) => (/\\:/.test(markdown) ? "changed" : markdown.replace(/\\/g, "")),
    });
    expect(result.markdown).toBe("Fine \\{a}.\n\nNot :fine.\n");
    expect(result.skipped).toEqual([3]);
  });

  it("keeps the edits in a block that still render the same when another one doesn't", () => {
    // marked 0.3 has no single-tilde strikethrough, so widening `~a~` would change it; the escape still holds.
    const result = migrateContent("~a~ and {x}.\n", {
      render: (markdown) => (markdown.includes("~~") ? "changed" : markdown.replace(/\\/g, "")),
    });
    expect(result.markdown).toBe("~a~ and \\{x}.\n");
    expect(result.skipped).toEqual([1]);
  });

  it("widens single tildes in plain mode and escapes nothing else", async () => {
    const result = await migrated("a ~b {c}~ d", { syntax: "plain" });
    expect(result.markdown).toBe("a ~~b {c}~~ d");
  });

  it("keeps alert markers and emoji shortcodes for projects that render them", async () => {
    expect(
      (await migrated("> [!NOTE]\n> Hi :smile:\n", { alerts: true, emoji: true })).markdown,
    ).toBe("> [!NOTE]\n> Hi :smile:\n");
    expect((await migrated("> [!NOTE]\n> Hi :smile:\n")).markdown).toBe(
      "> \\[!NOTE\\]\n> Hi \\:smile:\n",
    );
  });

  it("honors the project's options", async () => {
    // Without GFM, `~a~` is text and a table is a paragraph.
    const result = await migrated("~a~ {b}\n", { options: { gfm: false } });
    expect(result.markdown).toBe("~a~ \\{b}\n");
  });
});
