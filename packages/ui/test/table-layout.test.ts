import { renderHtmlFromDocument, createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import html from "../src/html.ts";
import { typesetCss } from "../src/typeset-css.ts";

const offline = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
} as const;
// The document's blocks, without the typeset styles that open it.
const nodes = async (markdown: string, options = {}) =>
  (await parseMarkdown(markdown, html({ ...offline, ...options }))).nodes.filter(
    (node) => !Array.isArray(node) || node[0] !== "typeset-styles",
  );

const prs = `| PR | Summary | Status / your next step | Links |
|---|---|---|---|
| portal #1596 | Each user keeps their own column layout in every table | Christopher requested changes: show when the layout differs from the default and add a reset button. | [preview](https://example.com) |
| portal #1610 | Alert details describe demand line outliers: the quantity against the SKU's average per demand line | Preview deployed, e2e running, no reviewer. Check the before/after, then request Christopher. | [drop](https://example.com/d) |
| website #33 | Planning guides and a Netstock comparison | Green, no reviewer. Request Christopher. | |
`;

// A review report's table: the status holds the most text, the summary less, and the working note the least; the
// preview column has a cell with two chips.
const report = `| PR | Summary | Status / your next step | Preview | Working now |
|---|---|---|---|---|
| [#1610](https://github.com/acme/portal/pull/1610) | Stock warnings explain unusual order lines: the quantity against the item's average per order line. | Priya requested changes again this morning. The percentages look noisy with big numbers, so go back to the multiplier in the table and keep the percentage in the hover. The links point to a reservation, but the row shows past order lines. | [preview](https://example.com/1610) | Yes: an agent pushed at 08:57 and is watching the PR. |
| [#1596](https://github.com/acme/portal/pull/1596) | Each user keeps their own column layout in every table. | The feedback is pushed: a Columns menu with Reset to default, a dot when the layout differs, and column reordering. Checks are running. Check the preview, then ask Priya again. | [preview](https://example.com/1596) | No |
| [#1618](https://github.com/acme/portal/pull/1618) | The outlook chart reads from the solver's weekly table instead of building it in the warehouse. | Green. No reviewer. Ask Priya, and line it up with the solver release so both merge on the same day. | [preview](https://example.com/1618), [Nova](https://example.com/nova) | No |
`;

describe("table layout", () => {
  it.each(['note="Check"', ':note="data.note"'])(
    "lays out tables through comments with %s",
    async (binding) => {
      const preset = html(offline);
      const doc = await parseMarkdown(`Intro :comment[text]{${binding}}\n\n${prs}`, preset);
      const output = await renderHtmlFromDocument(doc, { ...preset, data: { note: "Why?" } });
      expect(output).toContain('class="cr"');
      expect(output).toMatch(/<div[^>]*data-stack="3-2"/);
    },
  );

  it("allows long headers above numeric values to wrap", async () => {
    const output = await createHtmlRenderer(html(offline))(
      "| Average response time (milliseconds) | Successful requests per second |\n|---|---|\n| 20 | 100 |",
    );
    expect(output).not.toMatch(/<th[^>]*data-short/);
  });

  it.each(["colspan", "rowspan"])("preserves native %s tables", async (span) => {
    const output = await createHtmlRenderer(html(offline))(
      `<table><thead><tr><th ${span}="2">Group</th><th>Description</th></tr></thead><tbody><tr><td>Team A</td><td>A long summary with enough text to classify as prose without any links.</td><td>A long detail with enough text to classify as prose without any links.</td></tr></tbody></table>`,
    );
    expect(output).toContain(`${span}="2"`);
    expect(output).not.toMatch(/<div[^>]*data-stack/);
    expect(output).not.toMatch(/<(?:td|th)[^>]*data-short/);
  });

  it("keeps the native caption of a table with several prose columns", async () => {
    const prose = "Release notes explain the changes and list the next steps for the team.";
    const output = await createHtmlRenderer(html(offline))(
      `<table><caption>Release decisions</caption><thead><tr><th>One</th><th>Two</th><th>Three</th><th>Four</th></tr></thead><tbody><tr><td>${prose}</td><td>${prose}</td><td>${prose}</td><td>${prose}</td></tr></tbody></table>`,
    );
    expect(output).toMatch(/<table>\s*<caption>Release decisions<\/caption>/);
    expect(output).not.toMatch(/<div[^>]*data-cols/);
  });

  it("keeps a small table as it is, with its short columns on one line", async () => {
    const [table] = await nodes("| Name | Seen |\n|---|---|\n| Heron | 2 |\n");
    expect(table![0]).toBe("table");
    expect(JSON.stringify(table)).toContain('"data-short":""');
  });

  it("puts a wide table in a div that grows, and stacks its prose columns in order", async () => {
    const [wrapper] = await nodes(prs);
    expect(wrapper![0]).toBe("div");
    expect(wrapper![1]).toMatchObject({
      "data-wide": "",
      "data-width": "72",
      "data-cols": "4",
      "data-stack": "3-2",
    });
    const table = wrapper![2] as unknown[];
    const tbody = table[3] as unknown[];
    const row = tbody[2] as [string, Record<string, string>, ...[string, Record<string, string>][]];
    const cells = row.slice(2) as [string, Record<string, string>][];
    expect(
      cells.map(([, attrs]) => [
        attrs["data-col"],
        attrs["data-row"] ?? null,
        "data-short" in attrs,
      ]),
    ).toEqual([
      ["1", null, true],
      ["2", "1", false],
      ["2", "2", false],
      ["3", null, true],
    ]);
    expect(cells.map(([, attrs]) => attrs.role)).toEqual(["cell", "cell", "cell", "cell"]);
    expect(row[1].role).toBe("row");
  });

  it("gives each long column a weight by how tall its text makes the rows, and short columns none", async () => {
    const [wrapper] = await nodes(report);
    const attrs = (wrapper as [string, Record<string, string>])[1];
    expect(attrs["data-cols"]).toBe("5");
    expect(attrs["data-w1"]).toBeUndefined();
    expect(attrs["data-w4"]).toBeUndefined();
    const [summary, status, working] = ["data-w2", "data-w3", "data-w5"].map((key) =>
      Number(attrs[key]),
    );
    // The status holds about twice the summary's text and the working note the least.
    expect(status).toBe(12);
    expect(summary).toBeGreaterThan(working!);
    expect(summary).toBeLessThan(status!);
  });

  it("gives two equally long columns more room than a shorter one", async () => {
    const long = "Changes will ship once the review passes. ".repeat(3).trim();
    const shorter = "Ship after the final review passes.";
    const row = `| ${long} | ${long} | ${shorter} |`;
    const output = await createHtmlRenderer(html(offline))(
      `| Summary | Status | Decision |\n|---|---|---|\n${row}\n${row}`,
    );
    const wrapper = output.match(/<div[^>]*data-cols="3"[^>]*>/)?.[0] ?? "";
    const weights = [...wrapper.matchAll(/data-w[123]="(\d+)"/g)].map((match) => Number(match[1]));
    expect(weights).toHaveLength(3);
    expect(weights[0]).toBe(weights[1]);
    expect(weights[1]).toBeGreaterThan(weights[2]!);
  });

  it("stacks a table whose narrowest prose column gets a small share at a wider width than an even one", async () => {
    const fold = async (markdown: string) =>
      Number(((await nodes(markdown))[0] as [string, Record<string, string>])[1]["data-fold"]);
    expect(await fold(report)).toBeGreaterThan(await fold(prs));
  });

  it("lets a cell of two chips break between them, and keeps a one-chip cell whole", async () => {
    const [wrapper] = await nodes(report);
    const json = JSON.stringify(wrapper);
    expect(json).toContain('"data-short":"chips"');
    expect(json).toMatch(/"data-short":""[^\]]*\["chip"/);
  });

  it("lets a cell of two thumbnails break between them, and counts no image that isn't one", async () => {
    const table =
      "| Id | Kind | Area | Where |\n|---|---|---|---|\n| a1 | page | home | ![One](a.png) ![Two](b.png) |\n| b2 | card | cart | ![Three](c.png) |";
    expect(JSON.stringify(await nodes(table))).toContain('"data-short":"chips"');
    const plain = JSON.stringify(
      await nodes(table, { zoom: { thumbnails: false, images: false } }),
    );
    expect(plain).not.toContain('"data-short":"chips"');
    expect(plain).not.toContain("data-wide");
  });

  it("counts a screenshot a cell names as one thumbnail, without its notes", async () => {
    const shot = (id: string) =>
      `::screenshot{#${id} src="${id}.png" alt="${id}"}\n:::annotation{x=10 y=10 w=20 h=10}\nA long note ${Array.from({ length: 16 }, (_, n) => `[link](https://example.com/${n})`).join(" ")}\n:::\n::`;
    const table = `| Id | Kind | Area | Where |\n|---|---|---|---|\n| a1 | page | home | :screenshot{of="one"} :screenshot{of="two"} |\n| b2 | card | cart | :screenshot{of="three"} |\n\n${["one", "two", "three"].map(shot).join("\n\n")}`;
    const [first, ...rest] = await nodes(table);
    expect(first![0]).toBe("table");
    expect(JSON.stringify(first)).toContain('"data-short":"chips"');
    expect(JSON.stringify(first)).toMatch(/"td",\{"data-short":""\},\["screenshot",\{"id":"three"/);
    expect(JSON.stringify(rest)).not.toContain('"screenshot"');
  });

  it("keeps a short column's header on one line only when it's no longer than its cells", async () => {
    const output = await createHtmlRenderer(html(offline))(
      "| Server | Peak memory (megabytes) |\n|---|---|\n| node | 182 |\n| bun | 141 |",
    );
    expect(output).toContain('<th data-short="">Server</th>');
    expect(output).toContain("<th>Peak memory (megabytes)</th>");
    expect(output).toMatch(/<td data-short="">182<\/td>/);
  });

  it("wraps a table with prose that fits the column for its phone layout only, without a width", async () => {
    const [wrapper] = await nodes(
      "| Id | Description | Owner |\n|---|---|---|\n| T-1 | The import job keeps going past a bad row and lists it in the report. | Lena |\n",
    );
    expect(wrapper![0]).toBe("div");
    expect(wrapper![1]).toEqual({ "data-fit": "", "data-prose": "" });
    expect((wrapper![2] as [string, Record<string, string>])[1].role).toBe("table");
  });

  it("leaves tables inside a list item alone", async () => {
    const [list] = await nodes(`- One\n\n  ${prs.replaceAll("\n", "\n  ")}`);
    expect(JSON.stringify(list)).not.toContain("data-wide");
  });

  it("is on by default, adds div to the allowed tags, and turns off with tableLayout: false", async () => {
    expect(html(offline).tags).toContain("div");
    const [table] = await nodes(prs, { tableLayout: false });
    expect(table![0]).toBe("table");
  });

  it("styles every step, grows past the wide blocks' maximum, and stacks below its fold", async () => {
    const output = await createHtmlRenderer(html(offline))(report);
    const fold = /data-fold="(\d+)"/.exec(output)![1];
    expect(output).toContain('data-width="96"');
    expect(typesetCss).toContain('[data-width="96"]{--comark-wide-width:96em;}');
    expect(typesetCss).toContain("var(--comark-wide-max,var(--comark-wide-width))");
    expect(typesetCss).toContain(`@container(max-width:${Number(fold) - 0.01}em){`);
    expect(typesetCss).toContain('[data-w3="12"]{--_ty-c3:12fr;}');
  });
});
