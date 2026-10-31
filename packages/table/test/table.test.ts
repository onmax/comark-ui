import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import table, { components, type TableOptions } from "../src/html.ts";

const root = new URL("fixtures/", import.meta.url).pathname;
const render = (markdown: string, options: TableOptions = { root }) =>
  createHtmlRenderer({ plugins: [table(options)], components })(markdown);
const issues = async (markdown: string, options: TableOptions = { root }) =>
  (await parseMarkdown(markdown, { plugins: [table(options)] })).meta.issues;
const flat = (html: string) =>
  html.replace(/>\s+</g, "><").replace(/>\s+|\s+</g, (space) => space.trim());
const body = (html: string) =>
  /<tbody>([\s\S]*)<\/tbody>/.exec(html)?.[1]?.replace(/\s+/g, "") ?? "";

describe("comark-table", () => {
  it("reads a CSV file with quoted cells, aligns numbers right, and inlines the script once", async () => {
    const html = flat(
      await render('::table{src="bench.csv"}\n::\n\n::table{src="data/sizes.json"}\n::'),
    );
    expect(html).toContain(
      '<div class="ctb"><div class="ctb-bar"><span class="ctb-status" role="status"></span>',
    );
    expect(html).toContain("<th>Benchmark</th>");
    expect(html).toContain('<th style="text-align:right">Before (ms)</th>');
    expect(body(html)).toContain('<tr><td>parse</td><tdstyle="text-align:right">1,204</td>');
    expect(html).toContain("<td>render, cold</td>");
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html.match(/<style data-comark-table>/g)).toHaveLength(1);
  });

  it("reads a JSON array of objects, with a column for every key", async () => {
    const html = flat(await render('::table{src="data/sizes.json"}\n::'));
    expect(html).toContain('<th>name</th><th style="text-align:right">size</th><th>script</th>');
    expect(body(html)).toContain(
      '<tr><td>tabs</td><tdstyle="text-align:right">2.4</td><td>true</td></tr>',
    );
    expect(body(html)).toContain(
      '<tr><td>zoom</td><tdstyle="text-align:right">3.1</td><td></td></tr>',
    );
  });

  it("turns csv and tsv fences into tables, and json, csv, or a Markdown table inside ::table", async () => {
    expect(body(await render("```csv\nname,size\nzoom,3\n```"))).toBe(
      '<tr><td>zoom</td><tdstyle="text-align:right">3</td></tr>',
    );
    expect(body(await render("```tsv\nname\tsize\nzoom\t3\n```"))).toContain("<td>zoom</td>");
    expect(body(await render('```tsv\nname\tnote\n"x"\tliteral\n```'))).toContain('<td>"x"</td>');
    expect(body(await render('::table\n```json\n[{"a": 1}]\n```\n::'))).toContain("1</td>");
    expect(await render('```json\n[{"a": 1}]\n```')).not.toContain("<table");
    expect(await render("```csv\na,b\n1,2\n```", { root, fences: false })).not.toContain("<table");
    const markdown = flat(
      await render("::table{sort}\n| Name | Size |\n| --- | --: |\n| zoom | 3 |\n::"),
    );
    expect(markdown).toContain('<th><button type="button" class="ctb-sort">Name</button></th>');
    expect(markdown).toContain(
      '<th style="text-align:right"><button type="button" class="ctb-sort">Size</button></th>',
    );
  });

  it("leaves plain Markdown tables alone", async () => {
    const html = await render("| a |\n| - |\n| 1 |");
    expect(html).toContain("<table>");
    expect(html).not.toContain("ctb");
  });

  it("makes headers sort buttons with `sort`, and drops the bar with `copy=false`", async () => {
    const html = flat(await render('::table{src="bench.csv" sort copy=false}\n::'));
    expect(html).toContain('<th><button type="button" class="ctb-sort">Benchmark</button></th>');
    expect(html).not.toContain(`class="ctb-bar"`);
  });

  it("tints a cell that is one tone span, and a row whose first cell is", async () => {
    const tint = (color: string) => `background-color:color-mix(in srgb,${color} 20%,transparent)`;
    const error = tint("var(--comark-danger,var(--ui-error,var(--destructive,#ee3533)))");
    const success = tint("var(--comark-success,var(--ui-success,var(--success,#259f56)))");
    const html = flat(
      await render(
        '| Step | Time |\n| --- | --: |\n| [build]{tone="error"} | [1.9 s]{tone=success} |\n| lint | [z]{.x tone="warning"} |',
      ),
    );
    expect(html).toContain(
      `<tr><td style="${error}">build</td><td style="text-align:right;${success}">1.9 s</td></tr>`,
    );
    expect(html).toContain('<span class="x">z</span>');
    expect(html).not.toContain("tone");
    expect(html).not.toContain("ctb");
    expect(body(await render('```csv\nname,ms\nparse,[12]{tone="info"}\n```'))).toBe(
      `<tr><td>parse</td><tdstyle="text-align:right;${tint("var(--comark-info,var(--ui-info,#2563eb))")}">12</td></tr>`.replace(
        /\s/g,
        "",
      ),
    );
    const sorted = flat(await render("::table{sort}\n| [A]{tone=info} |\n| - |\n| 1 |\n::"));
    expect(sorted).toContain('<button type="button" class="ctb-sort">A</button>');
    expect(await issues("::table{sort}\n| [A]{tone=info} |\n| - |\n| 1 |\n::")).toEqual([]);
  });

  it("reports a tone it doesn't know and a tone span that doesn't fill its cell", async () => {
    const { meta } = await parseMarkdown(
      '| a | b |\n| - | - |\n| 1 | [slow]{tone="warning"} today |\n| 2 | [3]{tone="red"} |',
      { plugins: [table({ root })] },
    );
    expect(meta.issueRules).toEqual({
      'Markdown table 1, row 1: the `tone` span "[slow]" doesn\'t fill its cell, so the cell isn\'t colored. Put the whole cell in the brackets, as `[slow today]{tone="warning"}`, or drop `{tone}`.':
        "comark/table/partial-tone",
      "Markdown table 1, row 2: \"red\" isn't a tone, so the cell isn't colored. Use `success`, `warning`, `error`, or `info`.":
        "comark/table/unknown-tone",
    });
    const html = await render("| a |\n| - |\n| [3]{tone=red} |");
    expect(html).not.toContain("background-color");
    expect(html).toContain("3");
    const invalidCell = await render(
      "| a | b |\n| - | - |\n| [row]{tone=success} | [bad]{tone=red} |",
    );
    expect(invalidCell).toContain("<td>bad</td>");
  });

  it("reads files through `read`, relative to `base`", async () => {
    const seen: string[] = [];
    const read = (path: string) => (seen.push(path), "a,b\n1,2");
    expect(await render('::table{src="../data.csv"}\n::', { read, base: "guide/deep" })).toContain(
      "<table>",
    );
    expect(seen).toEqual(["guide/data.csv"]);
  });

  it("reports what it can't read, and keeps a broken fence as code", async () => {
    expect(await issues('::table{src="missing.csv"}\n::')).toEqual([
      '`::table` 1 ("missing.csv"): file not found. It resolved to "missing.csv" under the root; check the path or `base`.',
    ]);
    expect(await issues('::table{src="../../etc/passwd.csv"}\n::')).toEqual([
      '`::table` 1 ("../../etc/passwd.csv"): the path leaves the root. Move the file under the root or widen `root`.',
    ]);
    expect(await issues('::table{src="https://x.test/a.csv"}\n::')).toEqual([
      '`::table` 1 ("https://x.test/a.csv"): `src` must be a local file; a table can\'t read a URL.',
    ]);
    expect(await issues('::table{src="notes.txt"}\n::', { read: () => "x" })).toEqual([
      '`::table` 1 ("notes.txt"): can\'t read "txt". Use a .csv, .tsv, or .json file or fence, or set `format`.',
    ]);
    expect(await issues('::table\n```json\n{"a": 1}\n```\n::')).toEqual([
      '`::table` 1: its JSON must be an array of objects, one per row, such as `[{"name": "a", "size": 1}]`.',
    ]);
    expect(await issues("::table\nJust text.\n::")).toEqual([
      '`::table` 1 has nothing to show. Give it `src="data.csv"`, or put one Markdown table or one csv, tsv, or json fence inside it.',
    ]);
    expect(await issues("```csv\na,b\n1,2,3\n```")).toEqual([
      "The ```csv fence 1: row 1 has 3 cells, but the header has 2. Give every row one cell per column.",
    ]);
    const unclosed = '```csv\na,b\n"1,2\n```';
    expect(await issues(unclosed)).toEqual([
      'The ```csv fence 1: a quoted cell never ends. Close it with `"`, and write a quote inside one as `""`.',
    ]);
    expect(await render(unclosed)).toContain("<pre");
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parseMarkdown(
      '::table{src="https://x.test/a.csv" sortable}\n::\n\n```csv\na,b\n1,2,3\n```',
      { plugins: [table({ root })] },
    );
    expect(meta.issueRules).toEqual({
      "`::table` 1 (\"https://x.test/a.csv\"): `sortable` isn't a prop of `::table`, so it's ignored. Use `src`, `format`, `sort`, or `copy`.":
        "comark/table/unknown-prop",
      '`::table` 1 ("https://x.test/a.csv"): `src` must be a local file; a table can\'t read a URL.':
        "comark/table/remote-src",
      "The ```csv fence 1: row 1 has 3 cells, but the header has 2. Give every row one cell per column.":
        "comark/table/uneven-row",
    });
  });
});
